import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendMagicLinkEmail(to: string, link: string): Promise<void> {
  if (!resend) {
    console.warn('[magic-link] RESEND_API_KEY not set — link not emailed, printing instead:', link)
    return
  }

  await resend.emails.send({
    from: process.env.MAGIC_LINK_FROM_EMAIL ?? 'onboarding@resend.dev',
    to,
    subject: 'Your sign-in link',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color:#0f172a; margin: 0 0 12px;">Sign in to Personal Dashboard</h2>
        <p style="color:#475569; font-size:14px; line-height:1.6; margin: 0 0 20px;">
          Click the button below to sign in. This link expires in 15 minutes and can only be used once.
        </p>
        <a href="${link}" style="display:inline-block; background:#0f172a; color:#fff; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">
          Sign in
        </a>
        <p style="color:#94a3b8; font-size:12px; margin-top:28px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  })
}
