import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/StatusBadge";
import DeadlinePill from "@/components/DeadlinePill";
import { getActiveDeadline, formatDate } from "@/lib/deadlines";
import { REQUEST_TYPE_LABELS, CLOSED_STATUSES } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireSession(slug);

  const hoa = await prisma.hoa.findUnique({ where: { slug } });
  if (!hoa) notFound();

  const requests = await prisma.request.findMany({
    where: { hoaId: hoa.id, status: { notIn: CLOSED_STATUSES } },
    orderBy: { submittedAt: "asc" },
  });

  const now = new Date();
  const rows = requests
    .map((r) => ({ request: r, deadline: getActiveDeadline(r, now) }))
    .sort((a, b) => {
      // Most urgent (fewest days remaining) first; no-deadline last.
      const av = a.deadline ? a.deadline.daysRemaining : Infinity;
      const bv = b.deadline ? b.deadline.daysRemaining : Infinity;
      return av - bv;
    });

  const counts = { red: 0, yellow: 0, green: 0, overdue: 0 };
  for (const { deadline } of rows) {
    if (!deadline) continue;
    counts[deadline.urgency as "red" | "yellow" | "green"]++;
    if (deadline.overdue) counts.overdue++;
  }

  return (
    <DashboardShell slug={slug} hoaName={hoa.name} active="active">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Active Requests</h1>
          <p className="text-sm text-ink-muted">
            {requests.length} open request{requests.length === 1 ? "" : "s"} on
            the clock
          </p>
        </div>
        <Link href={`/submit/${slug}`} className="btn-secondary" target="_blank">
          Public form ↗
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Overdue" value={counts.overdue} tone="red" />
        <SummaryCard label="Due < 7 days" value={counts.red} tone="red" />
        <SummaryCard label="Due 7–14 days" value={counts.yellow} tone="yellow" />
        <SummaryCard label="On track" value={counts.green} tone="green" />
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            No active requests. New submissions will appear here.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Active deadline</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ request, deadline }) => (
                <tr key={request.id} className="hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/${slug}/requests/${request.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {request.referenceNumber}
                    </Link>
                    <div className="text-xs text-ink-muted">
                      {request.homeownerName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {request.propertyAddress}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {REQUEST_TYPE_LABELS[request.requestType]}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="px-4 py-3">
                    <DeadlinePill deadline={deadline} />
                    {deadline && (
                      <div className="mt-1 text-xs text-ink-muted">
                        {formatDate(deadline.date)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {formatDate(request.submittedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardShell>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "yellow" | "green";
}) {
  const toneClasses = {
    red: "text-red-700",
    yellow: "text-amber-700",
    green: "text-green-700",
  }[tone];
  return (
    <div className="card p-4">
      <div className={`text-2xl font-bold ${value > 0 ? toneClasses : "text-ink-muted"}`}>
        {value}
      </div>
      <div className="text-xs text-ink-muted">{label}</div>
    </div>
  );
}
