// Contact fields are masked by default on the Lead Feed and revealed
// only on explicit click, which is what makes the reveal-audit log
// (§5.3) meaningful — the real value must never be in the initial
// server-rendered payload at all, not just CSS-hidden.

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***-***-${digits.slice(-4)}`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}
