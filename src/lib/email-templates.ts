import { formatDate } from "./deadlines";

const wrap = (title: string, body: string) => `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#1f2933; max-width:560px; margin:0 auto;">
    <div style="border-bottom:3px solid #243b53; padding:16px 0; margin-bottom:24px;">
      <span style="font-size:18px; font-weight:700; color:#243b53;">ARCTrack</span>
      <span style="color:#7b8794; font-size:13px;"> &middot; ARC Request Tracking</span>
    </div>
    <h1 style="font-size:20px; margin:0 0 16px;">${title}</h1>
    ${body}
    <p style="margin-top:32px; padding-top:16px; border-top:1px solid #e2e8f0; color:#7b8794; font-size:12px; line-height:1.5;">
      This tool assists with deadline tracking and does not constitute legal advice.
      Consult your association&rsquo;s attorney and governing documents.
    </p>
  </div>`;

const row = (label: string, value: string) =>
  `<tr><td style="padding:6px 12px 6px 0; color:#7b8794; font-size:13px; vertical-align:top;">${label}</td><td style="padding:6px 0; font-size:14px;">${value}</td></tr>`;

export function verificationEmail(args: {
  hoaName: string;
  verifyUrl: string;
  trialEndsAt: Date;
}) {
  const body = `
    <p style="font-size:14px; line-height:1.6;">
      Thanks for starting your ARCTrack free trial for
      <strong>${args.hoaName}</strong>. Please confirm your email address to
      activate your committee dashboard.
    </p>
    <p style="margin:20px 0;">
      <a href="${args.verifyUrl}" style="background:#243b53; color:#fff; text-decoration:none; padding:10px 18px; border-radius:6px; font-size:14px; display:inline-block;">Verify email &amp; activate</a>
    </p>
    <p style="font-size:13px; line-height:1.6; color:#7b8794;">
      Or paste this link into your browser:<br/>
      <span style="word-break:break-all;">${args.verifyUrl}</span>
    </p>
    <p style="font-size:14px; line-height:1.6;">
      Your 30-day free trial runs through
      <strong>${formatDate(args.trialEndsAt)}</strong>. No credit card required.
    </p>`;
  return {
    subject: `Verify your email to activate ARCTrack — ${args.hoaName}`,
    html: wrap("Confirm your email", body),
  };
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Free text -> escaped HTML preserving line breaks. */
const richText = (s: string) => escapeHtml(s).replace(/\n/g, "<br/>");

export function denialNoticeEmail(args: {
  hoaName: string;
  homeownerName: string;
  referenceNumber: string;
  propertyAddress: string;
  requestTypeLabel: string;
  denialReasons: string;
  denialRequiredChanges: string;
  noticeDate: Date;
  appealDeadline: Date;
}) {
  const body = `
    <p style="font-size:14px; line-height:1.6;">Dear ${escapeHtml(
      args.homeownerName
    )},</p>
    <p style="font-size:14px; line-height:1.6;">
      After review, the Architectural Review Committee of
      <strong>${escapeHtml(args.hoaName)}</strong> has
      <strong>denied</strong> your architectural request. The formal denial
      notice is attached to this email as a PDF.
    </p>
    <table style="border-collapse:collapse; margin:16px 0;">
      ${row("Reference #", `<strong>${escapeHtml(args.referenceNumber)}</strong>`)}
      ${row("Request type", escapeHtml(args.requestTypeLabel))}
      ${row("Property", escapeHtml(args.propertyAddress))}
      ${row("Notice date", formatDate(args.noticeDate))}
    </table>

    <h2 style="font-size:15px; margin:20px 0 4px;">Reasons for denial</h2>
    <p style="font-size:14px; line-height:1.6;">${richText(args.denialReasons)}</p>

    <h2 style="font-size:15px; margin:20px 0 4px;">Changes that would result in approval</h2>
    <p style="font-size:14px; line-height:1.6;">${richText(
      args.denialRequiredChanges
    )}</p>

    <div style="margin:20px 0; padding:14px 16px; background:#f7f9fb; border-left:3px solid #243b53;">
      <p style="margin:0; font-size:14px; line-height:1.6;">
        <strong>Your right to a hearing.</strong> Under Texas Property Code
        &sect;209.00505, you may request a hearing before the Board of Directors
        regarding this decision. To do so, submit a written request to the
        Association within 30 days of the notice date &mdash; on or before
        <strong>${formatDate(args.appealDeadline)}</strong>. If you timely
        request a hearing, the Board will hold it within 30 days of receiving
        your request.
      </p>
    </div>`;
  return {
    subject: `Architectural Request Denied — ${args.hoaName}`,
    html: wrap("Notice of denial", body),
  };
}

export function homeownerConfirmationEmail(args: {
  hoaName: string;
  homeownerName: string;
  referenceNumber: string;
  requestTypeLabel: string;
  propertyAddress: string;
  reviewDeadlineAt: Date;
}) {
  const body = `
    <p style="font-size:14px; line-height:1.6;">Dear ${args.homeownerName},</p>
    <p style="font-size:14px; line-height:1.6;">
      Thank you for submitting your architectural request to
      <strong>${args.hoaName}</strong>. Your request has been received and is
      pending review by the Architectural Review Committee.
    </p>
    <table style="border-collapse:collapse; margin:16px 0;">
      ${row("Reference #", `<strong>${args.referenceNumber}</strong>`)}
      ${row("Request type", args.requestTypeLabel)}
      ${row("Property", args.propertyAddress)}
      ${row("Target decision date", formatDate(args.reviewDeadlineAt))}
    </table>
    <p style="font-size:14px; line-height:1.6;">
      Please keep your reference number for your records. You will be notified of
      the committee&rsquo;s decision.
    </p>`;
  return {
    subject: `Request received — ${args.referenceNumber}`,
    html: wrap("Your request has been received", body),
  };
}

export function committeeNotificationEmail(args: {
  hoaName: string;
  homeownerName: string;
  referenceNumber: string;
  requestTypeLabel: string;
  propertyAddress: string;
  reviewDeadlineAt: Date;
  detailUrl: string;
}) {
  const body = `
    <p style="font-size:14px; line-height:1.6;">
      A new architectural request has been submitted to
      <strong>${args.hoaName}</strong>.
    </p>
    <table style="border-collapse:collapse; margin:16px 0;">
      ${row("Reference #", `<strong>${args.referenceNumber}</strong>`)}
      ${row("Homeowner", args.homeownerName)}
      ${row("Request type", args.requestTypeLabel)}
      ${row("Property", args.propertyAddress)}
      ${row("Review deadline", formatDate(args.reviewDeadlineAt))}
    </table>
    <p style="margin:20px 0;">
      <a href="${args.detailUrl}" style="background:#243b53; color:#fff; text-decoration:none; padding:10px 18px; border-radius:6px; font-size:14px; display:inline-block;">Open request</a>
    </p>`;
  return {
    subject: `New ARC request — ${args.referenceNumber} (${args.requestTypeLabel})`,
    html: wrap("New architectural request", body),
  };
}

export interface ReminderItem {
  referenceNumber: string;
  propertyAddress: string;
  deadlineLabel: string;
  statute: string;
  dueDate: Date;
  daysText: string;
  overdue: boolean;
  detailUrl: string;
}

export function committeeReminderEmail(args: {
  hoaName: string;
  items: ReminderItem[];
}) {
  const rows = args.items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; font-size:13px;">
          <strong>${i.referenceNumber}</strong><br/>
          <span style="color:#7b8794;">${i.propertyAddress}</span>
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; font-size:13px;">
          ${i.deadlineLabel}<br/>
          <span style="color:#7b8794;">${i.statute}</span>
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; font-size:13px; white-space:nowrap; color:${
          i.overdue ? "#b91c1c" : "#92400e"
        }; font-weight:600;">
          ${i.daysText}<br/>
          <span style="color:#7b8794; font-weight:400;">${formatDate(i.dueDate)}</span>
        </td>
      </tr>`
    )
    .join("");

  const body = `
    <p style="font-size:14px; line-height:1.6;">
      The following ${args.items.length} request${
        args.items.length === 1 ? " has" : "s have"
      } a statutory deadline within 7 days or already overdue for
      <strong>${args.hoaName}</strong>. Please act to preserve enforceability.
    </p>
    <table style="border-collapse:collapse; width:100%; margin:16px 0;">
      <thead>
        <tr style="text-align:left;">
          <th style="padding:8px 12px; font-size:12px; color:#7b8794; border-bottom:2px solid #243b53;">Request</th>
          <th style="padding:8px 12px; font-size:12px; color:#7b8794; border-bottom:2px solid #243b53;">Deadline</th>
          <th style="padding:8px 12px; font-size:12px; color:#7b8794; border-bottom:2px solid #243b53;">Due</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  return {
    subject: `⚠️ ${args.items.length} ARC deadline${
      args.items.length === 1 ? "" : "s"
    } need attention — ${args.hoaName}`,
    html: wrap("Deadline reminder", body),
  };
}
