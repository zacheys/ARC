import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveHoa } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/StatusBadge";
import DeadlinePill from "@/components/DeadlinePill";
import RequestActions from "./RequestActions";
import { getActiveDeadline, formatDate, formatDateTime } from "@/lib/deadlines";
import {
  REQUEST_TYPE_LABELS,
  DELIVERY_METHOD_LABELS,
  STATUS_LABELS,
} from "@/lib/labels";
import type { Activity, RequestStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const WORKFLOW_STEPS: RequestStatus[] = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
];
const DENIAL_STEPS: RequestStatus[] = [
  "DENIED",
  "APPEAL_REQUESTED",
  "HEARING_SCHEDULED",
  "APPEAL_RESOLVED",
];

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  await requireActiveHoa(slug);

  const request = await prisma.request.findFirst({
    where: { id, hoa: { slug } },
    include: {
      hoa: true,
      attachments: { orderBy: { createdAt: "asc" } },
      activities: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!request) notFound();

  const active = getActiveDeadline(request);
  const isDenialTrack = DENIAL_STEPS.includes(request.status);
  const steps: RequestStatus[] = isDenialTrack
    ? ["PENDING", "UNDER_REVIEW", ...DENIAL_STEPS]
    : WORKFLOW_STEPS;
  const currentIndex = steps.indexOf(request.status);

  const letterHref = `/dashboard/${slug}/requests/${id}/letter`;

  return (
    <DashboardShell
      slug={slug}
      hoaName={request.hoa.name}
      active="active"
      plan={request.hoa.plan}
      trialEndsAt={request.hoa.trialEndsAt}
    >
      <Link
        href={`/dashboard/${slug}`}
        className="text-sm text-ink-muted hover:text-ink-soft"
      >
        ← Back to active requests
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">
            {request.referenceNumber}
          </h1>
          <p className="text-sm text-ink-muted">
            {REQUEST_TYPE_LABELS[request.requestType]} · {request.propertyAddress}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Homeowner + request info */}
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Request details
            </h2>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Homeowner" value={request.homeownerName} />
              <Field label="Email" value={request.homeownerEmail} />
              <Field
                label="Phone"
                value={request.homeownerPhone || "—"}
              />
              <Field
                label="Submitted"
                value={formatDate(request.submittedAt)}
              />
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-ink-muted">
                  Description
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
                  {request.description}
                </dd>
              </div>
            </dl>
          </section>

          {/* Photos */}
          {request.attachments.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                Attachments ({request.attachments.length})
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {request.attachments.map((a) => {
                  const isImage = a.contentType.startsWith("image/");
                  return (
                    <a
                      key={a.id}
                      href={a.url}
                      target="_blank"
                      className="group block overflow-hidden rounded-md border border-gray-200"
                    >
                      {isImage ? (
                        <Image
                          src={a.url}
                          alt={a.filename}
                          width={300}
                          height={200}
                          className="h-32 w-full object-cover transition group-hover:opacity-90"
                        />
                      ) : (
                        <div className="flex h-32 flex-col items-center justify-center bg-gray-50 text-xs text-ink-muted">
                          <span className="text-2xl">📄</span>
                          <span className="mt-1 truncate px-2">
                            {a.filename}
                          </span>
                        </div>
                      )}
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* Denial record */}
          {request.denialReasons && (
            <section className="card border-red-200 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-700">
                Denial record (§209.00505)
              </h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-muted">
                    Reasons for denial
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
                    {request.denialReasons}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-muted">
                    Changes that would gain approval
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
                    {request.denialRequiredChanges}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                  <Field
                    label="Notice date"
                    value={
                      request.denialNoticeDate
                        ? formatDate(request.denialNoticeDate)
                        : "—"
                    }
                  />
                  <Field
                    label="Delivery"
                    value={
                      request.denialDeliveryMethod
                        ? DELIVERY_METHOD_LABELS[request.denialDeliveryMethod]
                        : "—"
                    }
                  />
                </div>
              </dl>
              <Link
                href={letterHref}
                target="_blank"
                className="btn-secondary mt-4"
              >
                View denial letter ↗
              </Link>
            </section>
          )}

          {/* Appeal record */}
          {request.appealRequestedAt && (
            <section className="card p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                Appeal record
              </h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Field
                  label="Requested"
                  value={formatDate(request.appealRequestedAt)}
                />
                <Field
                  label="Hearing deadline"
                  value={
                    request.hearingDeadlineAt
                      ? formatDate(request.hearingDeadlineAt)
                      : "—"
                  }
                />
                <Field
                  label="Hearing scheduled"
                  value={
                    request.hearingScheduledAt
                      ? formatDateTime(request.hearingScheduledAt)
                      : "—"
                  }
                />
              </div>
              {request.appealResolution && (
                <div className="mt-3">
                  <dt className="text-xs uppercase tracking-wide text-ink-muted">
                    Resolution
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
                    {request.appealResolution}
                  </dd>
                </div>
              )}
            </section>
          )}

          {/* Activity log */}
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Activity log
            </h2>
            <ActivityLog activities={request.activities} />
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Active deadline highlight */}
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Active deadline
            </h2>
            {active ? (
              <div>
                <DeadlinePill deadline={active} />
                <p className="mt-2 text-sm font-medium text-ink">
                  {active.label}
                </p>
                <p className="text-sm text-ink-soft">
                  {formatDate(active.date)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">{active.statute}</p>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">
                No statutory clock is running for this request.
              </p>
            )}
          </section>

          {/* Timeline */}
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Status timeline
            </h2>
            <ol className="space-y-3">
              {steps.map((step, i) => {
                const done = i < currentIndex;
                const current = i === currentIndex;
                return (
                  <li key={step} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        done
                          ? "bg-brand-700 text-white"
                          : current
                            ? "bg-amber-500 text-white"
                            : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span
                      className={`text-sm ${
                        current
                          ? "font-semibold text-ink"
                          : done
                            ? "text-ink-soft"
                            : "text-ink-muted"
                      }`}
                    >
                      {STATUS_LABELS[step]}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Actions */}
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Committee actions
            </h2>
            <RequestActions
              slug={slug}
              id={id}
              status={request.status}
              letterHref={letterHref}
            />
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-soft">{value}</dd>
    </div>
  );
}

function ActivityLog({ activities }: { activities: Activity[] }) {
  if (activities.length === 0)
    return <p className="text-sm text-ink-muted">No activity yet.</p>;
  return (
    <ol className="space-y-4">
      {activities.map((a) => (
        <li key={a.id} className="flex gap-3">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-300" />
          <div>
            <p className="text-sm text-ink-soft">{a.message}</p>
            <p className="text-xs text-ink-muted">
              {formatDateTime(a.createdAt)}
              {a.actor ? ` · ${a.actor}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
