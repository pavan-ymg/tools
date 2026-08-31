import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// noreply@ymg-legal.com needs domain verification in Resend before it
// can actually send (SPF/DKIM records) — falls back to Resend's own
// pre-verified test sender so invites/resets work today regardless.
// Switch AUTH_EMAIL_FROM once the domain is verified; no code change
// needed here.
const FROM = process.env.AUTH_EMAIL_FROM || "YMG Ops <onboarding@resend.dev>";

export async function sendInviteEmail(to: string, name: string, inviteUrl: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "You're invited to YMG Ops",
    html: `<p>Hi ${name},</p><p>You've been invited to YMG Ops.</p><p><a href="${inviteUrl}">Click here to set your password</a> and get started.</p><p>This link expires in 72 hours.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your YMG Ops password",
    html: `<p><a href="${resetUrl}">Click here to reset your password</a>.</p><p>This link expires in 60 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}
