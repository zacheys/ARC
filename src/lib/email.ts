// Email service. If RESEND_API_KEY is unset, emails are logged to the console
// instead of being sent — so the app runs fully in dev without a key.

import { Resend } from "resend";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "ARCTrack <notifications@arctrack.org>";

const resend = apiKey ? new Resend(apiKey) : null;

export async function sendEmail(
  msg: EmailMessage
): Promise<{ sent: boolean; id?: string; error?: string }> {
  const recipients = Array.isArray(msg.to) ? msg.to : [msg.to];
  const cleanRecipients = recipients.filter(Boolean);

  if (cleanRecipients.length === 0) {
    return { sent: false, error: "No recipients" };
  }

  if (!resend) {
    // Dev stub — log a readable summary instead of sending.
    console.log(
      [
        "",
        "──────────── ✉️  EMAIL (dev stub, not sent) ────────────",
        `From:    ${from}`,
        `To:      ${cleanRecipients.join(", ")}`,
        `Subject: ${msg.subject}`,
        msg.attachments?.length
          ? `Attachments: ${msg.attachments.map((a) => a.filename).join(", ")}`
          : "",
        "────────────────────────────────────────────────────────",
        msg.text ?? stripHtml(msg.html),
        "────────────────────────────────────────────────────────",
        "",
      ].join("\n")
    );
    return { sent: false, id: "dev-stub" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: cleanRecipients,
      subject: msg.subject,
      html: msg.html,
      text: msg.text ?? stripHtml(msg.html),
      ...(msg.attachments?.length
        ? { attachments: msg.attachments.map((a) => ({ filename: a.filename, content: a.content })) }
        : {}),
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true, id: data?.id };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&sect;/g, "§")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
