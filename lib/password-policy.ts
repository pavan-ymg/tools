// Length + breach-checking beat complexity rules, which mostly just
// produce "Password1!" (§3.6.3 — current NIST guidance). This list is a
// pragmatic starting point, not exhaustive — swap in a proper breached-
// password list (or an HaveIBeenPwned k-anonymity lookup) before this
// holds anything more sensitive than lead/intake data.
const COMMON_PASSWORDS = new Set([
  "password", "password123", "password1234", "123456789012",
  "qwertyuiop123", "letmein12345", "welcome123456", "admin1234567",
  "changeme1234", "iloveyou1234", "sunshine1234", "princess1234",
  "football1234", "baseball1234", "dragon1234567", "monkey1234567",
  "trustno1234", "abc123456789",
]);

const MIN_LENGTH = 12;

/**
 * Returns an error message, or null if the password is acceptable.
 * `email` is checked against so the password can't just be the user's
 * own account name.
 */
export function validatePassword(password: string, email: string): string | null {
  if (password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters.`;
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "That password is too common. Please choose another.";
  }
  const localPart = email.split("@")[0]?.toLowerCase();
  if (localPart && password.toLowerCase().includes(localPart)) {
    return "Password must not contain your email address.";
  }
  return null;
}
