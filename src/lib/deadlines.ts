import type { Request } from "@prisma/client";

// --------------------------------------------------------------------------
// Statutory constants — Texas Property Code §209.00505
// --------------------------------------------------------------------------

/** Owner has 30 days from the denial notice to request a board hearing. */
export const APPEAL_WINDOW_DAYS = 30;

/** Board must hold the hearing within 30 days of the owner's request. */
export const HEARING_DEADLINE_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * All customers are Texas HOAs and §209.00505 deadlines are calendar-day based,
 * so every date/time is displayed AND every calendar-day comparison is done in
 * Central time — regardless of server (UTC on Vercel) or viewer timezone.
 * Storage stays UTC; this only affects rendering and day arithmetic.
 */
export const TIME_ZONE = "America/Chicago";

// --------------------------------------------------------------------------
// Date helpers
// --------------------------------------------------------------------------

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * The UTC-anchored midnight of the calendar day on which `date` falls IN
 * CENTRAL TIME. Used only for whole-day differences so DST never shifts a
 * deadline by a day. (Anchoring the Central Y/M/D to UTC midnight gives a
 * stable, DST-independent day index for subtraction.)
 */
function centralDayStartUtc(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"));
}

/** Whole Central-calendar days from now until `deadline`. Negative = overdue. */
export function daysRemaining(deadline: Date, now: Date = new Date()): number {
  return Math.round(
    (centralDayStartUtc(deadline) - centralDayStartUtc(now)) / MS_PER_DAY
  );
}

/** Date only, e.g. "July 6, 2026" — always in Central time. */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: TIME_ZONE,
  });
}

/** Date + time with zone label, e.g. "July 6, 2026, 3:14 PM CDT". */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
    timeZoneName: "short",
  });
}

/** Minutes UTC is ahead of Central at `date` (300 for CDT, 360 for CST). */
function centralOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const wallAsUtc = Date.UTC(
    g("year"),
    g("month") - 1,
    g("day"),
    g("hour"),
    g("minute"),
    g("second")
  );
  return Math.round((date.getTime() - wallAsUtc) / 60000);
}

/**
 * The exact UTC instant of Central-time 00:00 on a "YYYY-MM-DD" date. Use for
 * date-range filter boundaries so a Central calendar day maps to the correct
 * UTC window (e.g. "to: July 6" includes submissions through 05:59Z July 7).
 */
export function centralStartOfDay(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  const offset = centralOffsetMinutes(new Date(utcMidnight));
  return new Date(utcMidnight + offset * 60000);
}

/** Central-time start of the day AFTER `ymd` — an exclusive upper bound. */
export function centralEndOfDayExclusive(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return centralStartOfDay(next);
}

// --------------------------------------------------------------------------
// Deadline computation (used at write time)
// --------------------------------------------------------------------------

export function computeReviewDeadline(
  submittedAt: Date,
  reviewDeadlineDays: number
): Date {
  return addDays(submittedAt, reviewDeadlineDays);
}

export function computeAppealWindow(denialNoticeDate: Date): Date {
  return addDays(denialNoticeDate, APPEAL_WINDOW_DAYS);
}

export function computeHearingDeadline(appealRequestedAt: Date): Date {
  return addDays(appealRequestedAt, HEARING_DEADLINE_DAYS);
}

// --------------------------------------------------------------------------
// Active deadline (derived from status at read time)
// --------------------------------------------------------------------------

export type Urgency = "green" | "yellow" | "red" | "none";

export interface ActiveDeadline {
  label: string;
  statute: string;
  date: Date;
  daysRemaining: number;
  urgency: Urgency;
  overdue: boolean;
}

/** Urgency by days remaining: >14 green, 7–14 yellow, <7 or overdue red. */
export function urgencyFor(days: number): Exclude<Urgency, "none"> {
  if (days < 7) return "red";
  if (days <= 14) return "yellow";
  return "green";
}

/**
 * The single active statutory clock for a request, based on its status.
 * Returns null for closed/terminal states with no running deadline.
 */
export function getActiveDeadline(
  request: Pick<
    Request,
    | "status"
    | "reviewDeadlineAt"
    | "appealRequestWindowAt"
    | "hearingDeadlineAt"
  >,
  now: Date = new Date()
): ActiveDeadline | null {
  let date: Date | null = null;
  let label = "";
  let statute = "";

  switch (request.status) {
    case "PENDING":
    case "UNDER_REVIEW":
      date = request.reviewDeadlineAt;
      label = "Review decision due";
      statute = "Association review period (per CC&Rs)";
      break;
    case "DENIED":
      date = request.appealRequestWindowAt;
      label = "Owner's window to request a hearing";
      statute = "Tex. Prop. Code §209.00505 — 30-day appeal window";
      break;
    case "APPEAL_REQUESTED":
    case "HEARING_SCHEDULED":
      date = request.hearingDeadlineAt;
      label = "Board must hold hearing by";
      statute = "Tex. Prop. Code §209.00505 — 30-day hearing deadline";
      break;
    // APPROVED and APPEAL_RESOLVED are terminal — no active clock.
    default:
      date = null;
  }

  if (!date) return null;

  const days = daysRemaining(date, now);
  return {
    label,
    statute,
    date,
    daysRemaining: days,
    urgency: urgencyFor(days),
    overdue: days < 0,
  };
}

/** True when a request should trigger a reminder (within 7 days or overdue). */
export function needsReminder(
  request: Parameters<typeof getActiveDeadline>[0],
  now: Date = new Date()
): boolean {
  const active = getActiveDeadline(request, now);
  return !!active && active.daysRemaining <= 7;
}

// --------------------------------------------------------------------------
// Presentation helpers
// --------------------------------------------------------------------------

export function daysRemainingLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}

export const URGENCY_CLASSES: Record<Urgency, string> = {
  green: "bg-green-100 text-green-800 border-green-200",
  yellow: "bg-amber-100 text-amber-800 border-amber-200",
  red: "bg-red-100 text-red-800 border-red-200",
  none: "bg-gray-100 text-gray-600 border-gray-200",
};

export const URGENCY_DOT: Record<Urgency, string> = {
  green: "bg-green-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  none: "bg-gray-400",
};
