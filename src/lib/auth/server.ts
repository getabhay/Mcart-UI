import crypto from "crypto";

export type AuthProvider = "LOCAL" | "GOOGLE" | "FACEBOOK";

type CognitoTokens = {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
};

type CognitoClaims = {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
};

type UserProfilePayload = {
  name: string;
  email: string;
  provider: AuthProvider;
  cognitoSub: string;
  emailVerified: boolean;
  status?: "ACTIVE";
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function productServiceBaseUrl(): string {
  return requiredEnv("PRODUCT_SERVICE_BASE_URL").replace(/\/+$/, "");
}

function cognitoRegion(): string {
  return process.env.COGNITO_REGION?.trim() || process.env.AWS_REGION?.trim() || "ap-south-1";
}

function cognitoClientId(): string {
  return requiredEnv("COGNITO_CLIENT_ID");
}

function cognitoClientSecret(): string | undefined {
  const value = process.env.COGNITO_CLIENT_SECRET?.trim();
  return value || undefined;
}

function cognitoDomain(): string {
  const raw = requiredEnv("COGNITO_DOMAIN");
  return raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function socialRedirectUri(): string {
  return requiredEnv("COGNITO_REDIRECT_URI");
}

function createSecretHash(username: string): string | undefined {
  const secret = cognitoClientSecret();
  if (!secret) return undefined;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${username}${cognitoClientId()}`);
  return hmac.digest("base64");
}

async function callCognitoJson(target: string, body: unknown): Promise<Record<string, unknown>> {
  const region = cognitoRegion();
  const res = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": target,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const code = typeof payload.__type === "string" ? payload.__type.split("#").pop() : "CognitoError";
    const message = typeof payload.message === "string" ? payload.message : "Cognito request failed";
    throw new Error(`${code}: ${message}`);
  }

  return payload;
}

export function decodeJwtClaims(idToken: string): CognitoClaims {
  const parts = idToken.split(".");
  if (parts.length < 2) throw new Error("Invalid id token");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
  return {
    sub: typeof payload.sub === "string" ? payload.sub : "",
    email: typeof payload.email === "string" ? payload.email : "",
    name: typeof payload.name === "string" ? payload.name : "",
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
  };
}

function tokensFromAuthResult(value: unknown): CognitoTokens {
  const authResult = (value ?? {}) as Record<string, unknown>;
  const idToken = typeof authResult.IdToken === "string" ? authResult.IdToken : "";
  const accessToken = typeof authResult.AccessToken === "string" ? authResult.AccessToken : "";
  if (!idToken || !accessToken) throw new Error("Missing Cognito tokens");
  return {
    idToken,
    accessToken,
    refreshToken: typeof authResult.RefreshToken === "string" ? authResult.RefreshToken : undefined,
    expiresIn: typeof authResult.ExpiresIn === "number" ? authResult.ExpiresIn : undefined,
    tokenType: typeof authResult.TokenType === "string" ? authResult.TokenType : undefined,
  };
}

export async function cognitoSignUpAndSignIn(input: {
  name: string;
  email: string;
  password: string;
}): Promise<CognitoTokens> {
  const username = input.email.trim().toLowerCase();
  const signUpBody: Record<string, unknown> = {
    ClientId: cognitoClientId(),
    Username: username,
    Password: input.password,
    UserAttributes: [
      { Name: "email", Value: username },
      { Name: "name", Value: input.name.trim() },
    ],
  };
  const secretHash = createSecretHash(username);
  if (secretHash) signUpBody.SecretHash = secretHash;

  await callCognitoJson("AWSCognitoIdentityProviderService.SignUp", signUpBody);

  return cognitoSignIn({ email: username, password: input.password });
}

export async function cognitoSignIn(input: { email: string; password: string }): Promise<CognitoTokens> {
  const username = input.email.trim().toLowerCase();
  const authParameters: Record<string, string> = {
    USERNAME: username,
    PASSWORD: input.password,
  };
  const secretHash = createSecretHash(username);
  if (secretHash) authParameters.SECRET_HASH = secretHash;

  const result = await callCognitoJson("AWSCognitoIdentityProviderService.InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: cognitoClientId(),
    AuthParameters: authParameters,
  });

  return tokensFromAuthResult(result.AuthenticationResult);
}

export async function exchangeCodeForTokens(code: string): Promise<CognitoTokens> {
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cognitoClientId(),
    code,
    redirect_uri: socialRedirectUri(),
  });

  const headers: HeadersInit = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const secret = cognitoClientSecret();
  if (secret) {
    const basic = Buffer.from(`${cognitoClientId()}:${secret}`).toString("base64");
    headers.Authorization = `Basic ${basic}`;
  }

  const res = await fetch(`https://${cognitoDomain()}/oauth2/token`, {
    method: "POST",
    headers,
    body: form.toString(),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const error = typeof json.error === "string" ? json.error : "token_exchange_failed";
    const description =
      typeof json.error_description === "string" ? json.error_description : "Unable to exchange Cognito code";
    throw new Error(`${error}: ${description}`);
  }

  return {
    idToken: typeof json.id_token === "string" ? json.id_token : "",
    accessToken: typeof json.access_token === "string" ? json.access_token : "",
    refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
    expiresIn: typeof json.expires_in === "number" ? json.expires_in : undefined,
    tokenType: typeof json.token_type === "string" ? json.token_type : undefined,
  };
}

export async function findUserByEmail(email: string, provider?: AuthProvider): Promise<boolean> {
  const base = productServiceBaseUrl();
  const params = new URLSearchParams({ email });
  if (provider) params.set("provider", provider);

  const res = await fetch(`${base}/api/v1/users/profile/by-email?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (res.ok) return true;
  if (res.status === 404) return false;
  const message = await res.text().catch(() => "Backend user lookup failed");
  throw new Error(message || "Backend user lookup failed");
}

async function postBackend(path: string, body: UserProfilePayload): Promise<void> {
  const base = productServiceBaseUrl();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "Backend request failed");
    throw new Error(message || "Backend request failed");
  }
}

export async function saveUserSignup(body: UserProfilePayload): Promise<void> {
  await postBackend("/api/v1/users/signup", body);
}

export async function saveUserProfile(body: UserProfilePayload): Promise<void> {
  await postBackend("/api/v1/users/profile", body);
}

export async function changeCognitoPassword(input: {
  accessToken: string;
  previousPassword: string;
  proposedPassword: string;
}): Promise<void> {
  await callCognitoJson("AWSCognitoIdentityProviderService.ChangePassword", {
    AccessToken: input.accessToken,
    PreviousPassword: input.previousPassword,
    ProposedPassword: input.proposedPassword,
  });
}

export async function updateCognitoUserAttributes(input: {
  accessToken: string;
  name?: string;
  email?: string;
}): Promise<void> {
  const accessToken = input.accessToken.trim();
  if (!accessToken) throw new Error("Missing access token");

  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  const userAttributes: Array<{ Name: string; Value: string }> = [];
  if (name) userAttributes.push({ Name: "name", Value: name });
  if (email) userAttributes.push({ Name: "email", Value: email });
  if (userAttributes.length === 0) return;

  await callCognitoJson("AWSCognitoIdentityProviderService.UpdateUserAttributes", {
    AccessToken: accessToken,
    UserAttributes: userAttributes,
  });
}

export async function cognitoRefreshTokens(input: {
  refreshToken: string;
  username: string;
}): Promise<CognitoTokens> {
  const username = input.username.trim().toLowerCase();
  const authParameters: Record<string, string> = {
    REFRESH_TOKEN: input.refreshToken,
    USERNAME: username,
  };
  const secretHash = createSecretHash(username);
  if (secretHash) authParameters.SECRET_HASH = secretHash;

  const result = await callCognitoJson("AWSCognitoIdentityProviderService.InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: cognitoClientId(),
    AuthParameters: authParameters,
  });

  const tokens = tokensFromAuthResult(result.AuthenticationResult);
  if (!tokens.refreshToken) tokens.refreshToken = input.refreshToken;
  return tokens;
}
