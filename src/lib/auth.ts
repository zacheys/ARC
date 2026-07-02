import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Hoa } from "@prisma/client";
import { prisma } from "./prisma";
import { isDashboardBlocked } from "./plan";
import {
  sessionCookieName,
  verifySessionToken,
  type SessionPayload,
} from "./session";

/** Read + verify the committee session for a given HOA slug (or null). */
export async function getSession(
  slug: string
): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(sessionCookieName(slug))?.value;
  const payload = await verifySessionToken(token);
  if (!payload || payload.slug !== slug) return null;
  return payload;
}

/** Require a valid session for `slug`, else redirect to that HOA's login. */
export async function requireSession(slug: string): Promise<SessionPayload> {
  const session = await getSession(slug);
  if (!session) redirect(`/dashboard/${slug}/login`);
  return session;
}

/**
 * Gate for committee dashboard pages: require a session, load the HOA, and
 * redirect to the trial-ended page when the trial has lapsed on a non-active
 * plan. Returns the full HOA for banner/plan display.
 *
 * NOTE: This is intentionally NOT in middleware — the trial check hits the DB.
 * Public surfaces (/submit, /status, cron) never call this, so homeowners are
 * never blocked by the committee's billing status.
 */
export async function requireActiveHoa(slug: string): Promise<Hoa> {
  await requireSession(slug);
  const hoa = await prisma.hoa.findUnique({ where: { slug } });
  if (!hoa) notFound();
  if (isDashboardBlocked(hoa)) redirect(`/dashboard/${slug}/expired`);
  return hoa;
}
