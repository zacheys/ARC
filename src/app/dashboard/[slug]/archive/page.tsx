import Link from "next/link";
import type { Prisma, RequestStatus, RequestType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveHoa } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/lib/deadlines";
import {
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_OPTIONS,
  STATUS_LABELS,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

const STATUS_VALUES = Object.keys(STATUS_LABELS) as RequestStatus[];
const TYPE_VALUES = REQUEST_TYPE_OPTIONS.map(([v]) => v);

export default async function ArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { slug } = await params;
  const hoa = await requireActiveHoa(slug);
  const sp = await searchParams;

  const where: Prisma.RequestWhereInput = { hoaId: hoa.id };
  if (sp.q)
    where.propertyAddress = { contains: sp.q, mode: "insensitive" };
  if (sp.type && TYPE_VALUES.includes(sp.type as RequestType))
    where.requestType = sp.type as RequestType;
  if (sp.status && STATUS_VALUES.includes(sp.status as RequestStatus))
    where.status = sp.status as RequestStatus;
  if (sp.from || sp.to) {
    where.submittedAt = {};
    if (sp.from) where.submittedAt.gte = new Date(sp.from);
    if (sp.to) {
      const to = new Date(sp.to);
      to.setHours(23, 59, 59, 999);
      where.submittedAt.lte = to;
    }
  }

  const requests = await prisma.request.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    take: 500,
  });

  return (
    <DashboardShell
      slug={slug}
      hoaName={hoa.name}
      active="archive"
      plan={hoa.plan}
      trialEndsAt={hoa.trialEndsAt}
    >
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink">Records Archive</h1>
        <p className="text-sm text-ink-muted">
          Complete, searchable record of every request — the association&rsquo;s
          defensibility file.
        </p>
      </div>

      {/* Filters */}
      <form
        method="get"
        className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="lg:col-span-2">
          <label className="label" htmlFor="q">
            Property address
          </label>
          <input
            id="q"
            name="q"
            defaultValue={sp.q ?? ""}
            className="input"
            placeholder="Search address…"
          />
        </div>
        <div>
          <label className="label" htmlFor="type">
            Type
          </label>
          <select id="type" name="type" defaultValue={sp.type ?? ""} className="input">
            <option value="">All</option>
            {REQUEST_TYPE_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={sp.status ?? ""}
            className="input"
          >
            <option value="">All</option>
            {STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="from">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={sp.from ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={sp.to ?? ""}
            className="input"
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
          <button className="btn-primary">Apply filters</button>
          <Link href={`/dashboard/${slug}/archive`} className="btn-secondary">
            Reset
          </Link>
          <span className="ml-auto self-center text-sm text-ink-muted">
            {requests.length} result{requests.length === 1 ? "" : "s"}
          </span>
        </div>
      </form>

      <div className="card overflow-hidden">
        {requests.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            No requests match your filters.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Decided</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/${slug}/requests/${r.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {r.referenceNumber}
                    </Link>
                    <div className="text-xs text-ink-muted">
                      {r.homeownerName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.propertyAddress}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {REQUEST_TYPE_LABELS[r.requestType]}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {formatDate(r.submittedAt)}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {r.decisionAt ? formatDate(r.decisionAt) : "—"}
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
