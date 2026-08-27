"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function loginAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/leads",
    });
  } catch (error) {
    // NEXT_REDIRECT is thrown on success — let it propagate.
    if (error instanceof AuthError) {
      // Same message regardless of which check failed (§3.6.2).
      return "Invalid email or password.";
    }
    throw error;
  }
}
