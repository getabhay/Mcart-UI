# AWS Cognito Setup: Auto-Confirm Users with Pre Sign-up Lambda

Last updated: 2026-03-19  
Target region example: `ap-south-1`

This guide configures Cognito so your current app flow works without `UserNotConfirmedException`.

## Goal

When a user signs up with email/password, Cognito should:

1. auto-confirm the user
2. auto-verify email (recommended)
3. allow immediate login and token issuance

## A. Required Cognito Components

## 1) User Pool

Create or use an existing Cognito User Pool.

Required choices:

- Sign-in option: `Email`
- Self-registration: `Enabled`
- App integration enabled (Hosted UI domain, app client)

## 2) App Client

Create app client under same user pool.

Required fields:

- Application type: `Traditional web application` (confidential client; includes client secret)
- OAuth grant type: `Authorization code grant`
- OpenID scopes: `openid`, `email`, `profile`
- Callback URL (dev): `http://localhost:3000/auth/callback`
- Sign-out URL (dev): `http://localhost:3000`
- Identity providers: `Cognito User Pool`, `Google`, `Facebook` (when social is configured)
- Enable password auth flow for local login: `ALLOW_USER_PASSWORD_AUTH`

## 3) Hosted UI Domain

Create a Cognito domain:

- Example: `your-prefix.auth.ap-south-1.amazoncognito.com`

You will use:

- Authorize endpoint: `https://<domain>/oauth2/authorize`
- Token endpoint: `https://<domain>/oauth2/token`
- Social redirect URI (in Google/Facebook consoles): `https://<domain>/oauth2/idpresponse`

## B. Create Pre Sign-up Lambda (Auto-confirm)

AWS Console:

1. Go to `AWS Lambda` -> `Create function`
2. Authoring option: `Author from scratch`
3. Function name: `cognito-pre-signup-autoconfirm`
4. Runtime: `Node.js 20.x` (or latest supported)
5. Architecture: `x86_64` (default)
6. Permissions: `Create a new role with basic Lambda permissions`
7. Create function

Replace function code with:

```js
export const handler = async (event) => {
  // Auto-confirm all self-service signups
  event.response.autoConfirmUser = true;

  // Recommended: auto-verify email so forgot-password works
  if (event.request?.userAttributes?.email) {
    event.response.autoVerifyEmail = true;
  }

  // Optional: auto-verify phone if you collect it
  if (event.request?.userAttributes?.phone_number) {
    event.response.autoVerifyPhone = true;
  }

  return event;
};
```

Deploy the Lambda.

## C. Attach Lambda to User Pool Trigger

AWS Console:

1. Go to `Cognito` -> `User pools` -> `<your-user-pool>`
2. Open `Extensions` (or `Lambda triggers`, based on console version)
3. Locate `Pre sign-up`
4. Select Lambda `cognito-pre-signup-autoconfirm`
5. Save changes

Notes:

- Cognito will automatically add the invoke permission (`lambda:InvokeFunction`) when attached in console.
- This trigger works for `SignUp` flow.  
- For `AdminCreateUser`, `autoConfirmUser/autoVerifyEmail/autoVerifyPhone` response flags are ignored.

## D. Update App Environment Variables

In your web app (`.env.local` / deployment env):

```env
COGNITO_REGION=ap-south-1
COGNITO_CLIENT_ID=<user-pool-app-client-id>
COGNITO_CLIENT_SECRET=<user-pool-app-client-secret>
COGNITO_DOMAIN=<your-prefix.auth.ap-south-1.amazoncognito.com>
COGNITO_REDIRECT_URI=http://localhost:3000/auth/callback

NEXT_PUBLIC_COGNITO_CLIENT_ID=<user-pool-app-client-id>
NEXT_PUBLIC_COGNITO_DOMAIN=<your-prefix.auth.ap-south-1.amazoncognito.com>
NEXT_PUBLIC_COGNITO_REDIRECT_URI=http://localhost:3000/auth/callback
```

## E. Validation Checklist

## 1) Local signup test

Run signup from UI with a new email.

Expected:

- backend `/users/signup` succeeds
- Cognito signup succeeds
- Cognito immediate signin succeeds (no `UserNotConfirmedException`)
- backend `/users/profile` succeeds

## 2) Cognito user status check

Cognito console -> Users -> new user:

- `Status` should be `CONFIRMED`
- Email should be verified (if `autoVerifyEmail=true`)

## 3) Local signin test

Expected:

- backend `/profile/by-email` check passes
- Cognito token issuance succeeds

## F. Security and Production Guidance

- Auto-confirm all users is convenient but lowers sign-up assurance.
- Prefer domain-gated or policy-gated auto-confirm in production.
- Keep `autoVerifyEmail=true` if you rely on forgot-password.
- Never expose `COGNITO_CLIENT_SECRET` in frontend env.

Safer production variation:

```js
export const handler = async (event) => {
  const email = (event.request?.userAttributes?.email || "").toLowerCase();
  const allowedDomain = "@mcart.com";

  if (email.endsWith(allowedDomain)) {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }
  return event;
};
```

## G. Troubleshooting

- `UserNotConfirmedException` still appears:
  - confirm trigger attached to correct user pool
  - deploy latest Lambda code
  - verify signup used `SignUp` API, not `AdminCreateUser`
- `invalid_client` at token exchange:
  - wrong client ID/secret pair
- `redirect_uri mismatch`:
  - callback URL mismatch between app client and env var

## References

- Pre sign-up trigger and response flags: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html
- Confirming users without code via pre sign-up trigger: https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html
- App client and OAuth settings: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html
- Authorization endpoint params: https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html
