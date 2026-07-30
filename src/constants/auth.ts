export const AUTH_MESSAGES = {
  errors: {
    invalid_credentials: "Invalid email or password.",
    email_taken: "An account with this email already exists.",
    weak_password: "Password must include 8 characters, uppercase, lowercase, a number, and a special character.",
  },
  success: {
    confirmation_link_sent: "Check your email for a confirmation link.",
  },
} as const
