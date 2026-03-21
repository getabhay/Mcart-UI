export const APP_TEXT = {
  common: {
    sessionExpired: "Session expired. Please login again.",
    requestFailed: "Request failed",
  },
  auth: {
    errors: {
      accountExists: "Account already exists for this email. Please login instead.",
      userNotConfirmed: "Your account is not confirmed yet. Please verify your email first.",
      backendUserNotFound: "No account found for this email. Please sign up first.",
      invalidCredentials: "Invalid email or password. Please try again.",
      passwordPolicy:
        "Password does not meet requirements.\nPassword requirements:\n- Contains at least 1 number\n- Contains at least 1 special character\n- Contains at least 1 uppercase letter\n- Contains at least 1 lowercase letter",
      signupFailed: "Signup failed",
      signinFailed: "Signin failed",
      loginFailed: "Login failed",
      socialStartFailed: "Unable to start social sign in",
      invalidSocialState: "Invalid social provider state",
      missingSocialConfig:
        "Missing Cognito social config. Set NEXT_PUBLIC_COGNITO_DOMAIN, NEXT_PUBLIC_COGNITO_CLIENT_ID, NEXT_PUBLIC_COGNITO_REDIRECT_URI",
    },
    validation: {
      nameRequired: "Name is required",
      emailRequired: "Email is required",
      passwordRequired: "Password is required",
      accessTokenRequired: "Missing access token",
      oldPasswordRequired: "Current password is required",
      newPasswordRequired: "New password is required",
      refreshTokenRequired: "Missing refresh token",
      usernameRequired: "Missing username",
      missingAuthCode: "Missing authorization code",
      missingState: "Missing state",
      invalidProviderInState: "Invalid provider in state",
      socialTokenNoEmail: "Social token did not include email",
    },
    success: {
      passwordUpdated: "Password updated successfully.",
    },
  },
  signupPage: {
    title: "Sign Up",
    subtitle: "Create your account",
    placeholders: {
      name: "Name",
      email: "Email",
      password: "Password",
    },
    consent: "I agree to Terms & Privacy Policy.",
    button: {
      submit: "Submit",
      creating: "Creating...",
      goToLogin: "Go To Login",
      back: "Back",
      continueGoogle: "Continue with Google",
      continueFacebook: "Continue with Facebook",
      redirectingGoogle: "Redirecting to Google...",
      redirectingFacebook: "Redirecting to Facebook...",
    },
    errors: {
      enterName: "Please enter name.",
      enterEmail: "Please enter email.",
      enterPassword: "Please enter password.",
      acceptCheckbox: "Please accept the checkbox to continue.",
    },
    success: {
      signupRedirecting: "Sign up successful. Redirecting...",
    },
  },
  profilePage: {
    title: {
      profile: "My Profile",
      password: "Update Password",
    },
    subtitle: {
      profile: "Manage profile details and password securely.",
      password: "Set a new password for your account.",
    },
    button: {
      updateProfile: "Update Profile",
      cancelUpdate: "Cancel Update",
      saveChanges: "Save Changes",
      saving: "Saving...",
      changePassword: "Change Password",
      updatePassword: "Update Password",
      updatingPassword: "Updating...",
      cancel: "Cancel",
    },
    status: {
      active: "ACTIVE",
      inactive: "INACTIVE",
    },
    labels: {
      name: "Name",
      email: "Email",
      verified: "Verified",
      provider: "Provider",
      status: "Status",
      profileAge: "Profile Age",
      lastProfileUpdate: "Last Profile Update",
      yes: "Yes",
      no: "No",
      editFields: "Edit Fields",
      nonEditableDetails: "Non-editable Details",
    },
    placeholders: {
      currentPassword: "Current password",
      newPassword: "New password",
      confirmNewPassword: "Confirm new password",
    },
    loading: "Loading profile...",
    errors: {
      loadFailed: "Unable to load profile.",
      fetchFailed: "Failed to fetch profile.",
      fallbackFetchFailed: "Unable to load profile details. Please try again.",
      updateFailed: "Unable to update profile.",
      duplicateEmail: "This email is already in use by another account. Please use a different email.",
      userNotFound: "Your profile was not found. Please login again.",
      incorrectCurrentPassword: "Current password is incorrect. Please try again.",
      currentPasswordRequired: "Current password is required.",
      newPasswordRequired: "New password is required.",
      minPasswordLength: "New password must be at least 8 characters.",
      confirmPasswordMismatch: "New password and confirm password do not match.",
      updatePasswordFailed: "Unable to update password.",
      nameRequired: "Name is required.",
      emailRequired: "Email is required.",
    },
    success: {
      profileUpdated: "Profile updated successfully.",
      passwordUpdated: "Password updated successfully.",
    },
  },
  headerAuth: {
    title: {
      welcome: "Welcome",
    },
    subtitle: {
      loginPrompt: "Login to access orders, wishlist & more",
    },
    tabs: {
      login: "Login",
      signup: "Sign Up",
    },
    button: {
      login: "Login",
      signingIn: "Signing in...",
      createAccount: "Create account",
      submit: "Submit",
      creating: "Creating...",
      backToLogin: "Back to Login",
      continueGoogle: "Continue with Google",
      continueFacebook: "Continue with Facebook",
      redirectingGoogle: "Redirecting to Google...",
      redirectingFacebook: "Redirecting to Facebook...",
    },
    separator: "OR",
    signupSuccessForLogin: "Account already exists. Please login to continue.",
    consent: "I agree to Terms & Privacy Policy.",
  },
  api: {
    auth: {
      backendUserNotFound: "User not found in backend database",
      signupFailed: "Signup failed",
      signinFailed: "Signin failed",
      socialSigninFailed: "Social sign in failed",
      refreshTokenFailed: "Unable to refresh token",
      passwordUpdateFailed: "Unable to update password",
    },
  },
} as const;

export function toFriendlyAuthError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("usernameexistsexception") || msg.includes("user already exists")) {
    return APP_TEXT.auth.errors.accountExists;
  }
  if (
    msg.includes("notauthorizedexception: incorrect username or password") ||
    msg.includes("incorrect username or password")
  ) {
    return APP_TEXT.auth.errors.invalidCredentials;
  }
  if (msg.includes("usernotconfirmedexception")) {
    return APP_TEXT.auth.errors.userNotConfirmed;
  }
  if (msg.includes("invalidpasswordexception") || msg.includes("password did not conform with policy")) {
    return APP_TEXT.auth.errors.passwordPolicy;
  }
  if (msg.includes("user not found in backend database")) {
    return APP_TEXT.auth.errors.backendUserNotFound;
  }
  return message;
}

export function toFriendlyProfileError(message: string): string {
  const msg = message.toLowerCase();
  if (
    msg.includes("user not found with cognitosub") ||
    msg.includes("user not found")
  ) {
    return APP_TEXT.profilePage.errors.userNotFound;
  }
  if (
    msg.includes("query did not return a unique result") ||
    msg.includes("2 results were returned") ||
    (msg.includes("email") && msg.includes("already"))
  ) {
    return APP_TEXT.profilePage.errors.duplicateEmail;
  }
  return message;
}
