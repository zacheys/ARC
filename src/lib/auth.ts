import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
