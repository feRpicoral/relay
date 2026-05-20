import "server-only";

import { FROM_EMAIL, getResend } from "./resend";

interface InviteEmailParams {
  to: string;
  orgName: string;
  inviterName: string;
  acceptUrl: string;
}

const inviteHtml = ({ orgName, inviterName, acceptUrl }: Omit<InviteEmailParams, "to">) => `
<!doctype html>
<html>
  <body style="font-family: ui-sans-serif, system-ui, sans-serif; background: #0c0c0d; color: #f5f5f7; padding: 40px;">
    <div style="max-width: 480px; margin: 0 auto; background: #1a1a1d; border-radius: 16px; padding: 32px;">
      <h2 style="margin: 0 0 12px 0; font-size: 20px;">You're invited to ${orgName}</h2>
      <p style="margin: 0 0 24px 0; color: #b4b4b8; line-height: 1.6;">
        ${inviterName} invited you to collaborate on their Relay voice AI workspace.
      </p>
      <a href="${acceptUrl}"
         style="display: inline-block; padding: 10px 20px; background: #7c5cff; color: white; border-radius: 8px; text-decoration: none; font-weight: 500;">
        Accept invite
      </a>
      <p style="margin: 32px 0 0 0; color: #6b6b70; font-size: 12px;">
        If you didn't expect this, you can ignore this email.
      </p>
    </div>
  </body>
</html>
`;

export async function sendInviteEmail({
  to,
  orgName,
  inviterName,
  acceptUrl,
}: InviteEmailParams): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[invite] RESEND_API_KEY not set; skipping email send. URL:", acceptUrl);
    return;
  }
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${inviterName} invited you to ${orgName} on Relay`,
    html: inviteHtml({ orgName, inviterName, acceptUrl }),
  });
  if (error) throw new Error(`Failed to send invite email: ${error.message}`);
}
