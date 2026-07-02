import { prisma } from "@/lib/prisma";
import {
  getActiveDeadline,
  needsReminder,
  daysRemainingLabel,
} from "@/lib/deadlines";
import { logActivity } from "@/lib/activity";
import { sendEmail } from "@/lib/email";
import {
  committeeReminderEmail,
  type ReminderItem,
} from "@/lib/email-templates";
import { CLOSED_STATUSES } from "@/lib/labels";
import { getBaseUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if unconfigured
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const baseUrl = await getBaseUrl();

  // All active (non-terminal) requests across every HOA, with committee emails.
  const requests = await prisma.request.findMany({
    where: { status: { notIn: CLOSED_STATUSES } },
    include: { hoa: { select: { id: true, name: true, slug: true, committeeEmails: true } } },
  });

  const due = requests.filter((r) => needsReminder(r, now));

  // Group by HOA
  const byHoa = new Map<
    string,
    { hoa: (typeof requests)[number]["hoa"]; items: typeof requests }
  >();
  for (const r of due) {
    const entry = byHoa.get(r.hoa.id) ?? { hoa: r.hoa, items: [] };
    entry.items.push(r);
    byHoa.set(r.hoa.id, entry);
  }

  let emailsSent = 0;
  const summary: { hoa: string; count: number; notified: boolean }[] = [];

  for (const { hoa, items } of byHoa.values()) {
    const reminderItems: ReminderItem[] = items.map((r) => {
      const active = getActiveDeadline(r, now)!;
      return {
        referenceNumber: r.referenceNumber,
        propertyAddress: r.propertyAddress,
        deadlineLabel: active.label,
        statute: active.statute,
        dueDate: active.date,
        daysText: daysRemainingLabel(active.daysRemaining),
        overdue: active.overdue,
        detailUrl: `${baseUrl}/dashboard/${hoa.slug}/requests/${r.id}`,
      };
    });

    let notified = false;
    if (hoa.committeeEmails.length > 0) {
      const email = committeeReminderEmail({
        hoaName: hoa.name,
        items: reminderItems,
      });
      const res = await sendEmail({ to: hoa.committeeEmails, ...email });
      notified = res.sent || res.id === "dev-stub";
      if (res.sent) emailsSent++;
    }

    // Log a reminder entry on each affected request for the audit trail.
    for (const r of items) {
      await logActivity(
        r.id,
        "REMINDER_SENT",
        `Deadline reminder generated (${daysRemainingLabel(
          getActiveDeadline(r, now)!.daysRemaining
        )}).`,
        { actor: "system" }
      );
    }

    summary.push({ hoa: hoa.name, count: items.length, notified });
  }

  return Response.json({
    ok: true,
    ranAt: now.toISOString(),
    totalDue: due.length,
    emailsSent,
    summary,
  });
}
