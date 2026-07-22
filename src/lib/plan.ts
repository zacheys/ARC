import type { Hoa } from "@prisma/client";

// Contact address shown when a trial has ended. Change to your real inbox.
export const BILLING_CONTACT_EMAIL = "zachary@arctrack.org";

type PlanFields = Pick<Hoa, "plan" | "trialEndsAt">;

/** Whole days left in the trial (0 if already past). */
export function trialDaysLeft(
  hoa: PlanFields,
  now: Date = new Date()
): number {
  const ms = hoa.trialEndsAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/** True when the trial window has elapsed. */
export function isTrialExpired(
  hoa: PlanFields,
  now: Date = new Date()
): boolean {
  return hoa.trialEndsAt.getTime() <= now.getTime();
}

/**
 * True when the committee should be blocked from the dashboard: the trial
 * has ended AND the account is not on an active (paid) plan. ACTIVE accounts
 * are never blocked regardless of trialEndsAt.
 */
export function isDashboardBlocked(
  hoa: PlanFields,
  now: Date = new Date()
): boolean {
  if (hoa.plan === "ACTIVE") return false;
  return isTrialExpired(hoa, now);
}
