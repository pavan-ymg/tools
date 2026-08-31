import { consumeAuthToken } from "@/lib/auth-tokens";
import ResetForm from "./ResetForm";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tokenRow = await consumeAuthToken(token, "reset");

  if (!tokenRow) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--danger)" }}>This reset link is invalid or has expired.</p>
      </main>
    );
  }

  return <ResetForm token={token} />;
}
