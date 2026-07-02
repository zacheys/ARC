"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { lookupStatus, type StatusState } from "./actions";
import StatusBadge from "@/components/StatusBadge";
import DeadlinePill from "@/components/DeadlinePill";
import { getActiveDeadline, formatDate } from "@/lib/deadlines";
import { REQUEST_TYPE_LABELS } from "@/lib/labels";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Looking up…" : "Check status"}
    </button>
  );
}

export default function StatusLookup() {
  const [state, formAction] = useActionState<StatusState, FormData>(
    lookupStatus,
    {}
  );

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {state.error}
            </div>
          )}
          <div>
            <label className="label" htmlFor="referenceNumber">
              Reference number
            </label>
            <input
              id="referenceNumber"
              name="referenceNumber"
              className="input"
              required
              autoFocus
              placeholder="e.g. OAKRIDGE-2026-0001"
            />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              required
              autoComplete="email"
              placeholder="The email you submitted with"
            />
          </div>
          <SubmitButton />
        </form>
      </div>

      {state.result && <ResultCard result={state.result} />}

      <p className="text-center text-xs text-ink-muted">
        Need to submit a new request? Contact your association for your
        community&rsquo;s submission link.
      </p>
    </div>
  );
}

function ResultCard({ result }: { result: NonNullable<StatusState["result"]> }) {
  const deadline = getActiveDeadline(result);

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-lg font-bold text-brand-700">
            {result.referenceNumber}
          </div>
          <div className="text-sm text-ink-muted">
            {REQUEST_TYPE_LABELS[result.requestType]} · {result.propertyAddress}
          </div>
        </div>
        <StatusBadge status={result.status} />
      </div>

      <dl className="mt-5 divide-y divide-gray-100 text-sm">
        <div className="flex justify-between py-2">
          <dt className="text-ink-muted">Submitted</dt>
          <dd className="font-medium">{formatDate(result.submittedAt)}</dd>
        </div>
        {result.decisionAt && (
          <div className="flex justify-between py-2">
            <dt className="text-ink-muted">Decision date</dt>
            <dd className="font-medium">{formatDate(result.decisionAt)}</dd>
          </div>
        )}
      </dl>

      {deadline ? (
        <div className="mt-4 rounded-lg bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink">
              {deadline.label}
            </span>
            <DeadlinePill deadline={deadline} />
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {result.status === "PENDING" || result.status === "UNDER_REVIEW"
              ? `The committee's review deadline is ${formatDate(deadline.date)}.`
              : `${deadline.label} is ${formatDate(deadline.date)}.`}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">
          There is no active deadline on this request.
        </p>
      )}

      {result.status === "DENIED" && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">You have the right to a hearing.</p>
          <p className="mt-1">
            Under Texas Property Code &sect;209.00505 you have 30 days from the
            date of the denial notice to submit a written request for a board
            hearing
            {result.appealRequestWindowAt
              ? ` — on or before ${formatDate(result.appealRequestWindowAt)}.`
              : "."}
          </p>
        </div>
      )}
    </div>
  );
}
