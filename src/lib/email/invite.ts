import "server-only";

import { FROM_EMAIL, getResend } from "./resend";

interface InviteEmailParams {
  to: string;
  orgName: string;
  inviterName: string;
  acceptUrl: string;
}

/**
 * Minimal HTML entity escaper. Names are user-controlled (a workspace admin
 * can pick any display name), so we must escape before interpolating into the
 * email body — otherwise a name like `<script>...` renders as HTML in any
 * client that permits inline scripts. Resend's HTML pass-through is faithful.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const inviteHtml = ({ orgName, inviterName, acceptUrl }: Omit<InviteEmailParams, "to">) => {
  const safeOrg = escapeHtml(orgName);
  const safeInviter = escapeHtml(inviterName);
  // acceptUrl is a same-origin URL we constructed server-side; encode only the
  // attribute-context special characters as a belt-and-suspenders measure.
  const safeUrl = acceptUrl.replace(/"/g, "&quot;");
  return `
<!doctype html>
<html>
  <body style="font-family: ui-sans-serif, system-ui, sans-serif; background: #0c0c0d; color: #f5f5f7; padding: 40px;">
    <div style="max-width: 480px; margin: 0 auto; background: #1a1a1d; border-radius: 16px; padding: 32px;">
      <h2 style="margin: 0 0 12px 0; font-size: 20px;">You're invited to ${safeOrg}</h2>
      <p style="margin: 0 0 24px 0; color: #b4b4b8; line-height: 1.6;">
        ${safeInviter} invited you to collaborate on their Relay voice AI workspace.
      </p>
      <a href="${safeUrl}"
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
};

export async function sendInviteEmail({
  to,
  orgName,
  inviterName,
  acceptUrl,
}: InviteEmailParams): Promise<void> {
  const resend = getResend();
  if (!resend) {
    // Don't log the full acceptUrl — it carries the invite token, which would
    // leak via centralized logging.
    console.warn("[invite] RESEND_API_KEY not set; skipping email send for", to);
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
