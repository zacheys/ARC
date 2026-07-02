"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { RequestStatus } from "@prisma/client";
import {
  setUnderReview,
  approve,
  deny,
  requestAppeal,
  scheduleHearing,
  resolveAppeal,
  addNote,
  type ActionState,
} from "./actions";
import { DELIVERY_METHOD_OPTIONS } from "@/lib/labels";

function Pending({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <>{pending ? "Working…" : children}</>;
}

function ErrorLine({ state }: { state: ActionState }) {
  if (!state.error) return null;
  return (
    <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {state.error}
    </p>
  );
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function RequestActions({
  slug,
  id,
  status,
  letterHref,
}: {
  slug: string;
  id: string;
  status: RequestStatus;
  letterHref: string;
}) {
  return (
    <div className="space-y-4">
      {(status === "PENDING" || status === "UNDER_REVIEW") && (
        <DecisionBlock slug={slug} id={id} status={status} />
      )}

      {status === "DENIED" && (
        <>
          <a href={letterHref} target="_blank" className="btn-secondary w-full">
            View / print denial letter ↗
          </a>
          <RequestAppealForm slug={slug} id={id} />
        </>
      )}

      {status === "APPEAL_REQUESTED" && <ScheduleHearingForm slug={slug} id={id} />}
      {status === "HEARING_SCHEDULED" && <ResolveAppealForm slug={slug} id={id} />}

      {(status === "APPROVED" || status === "APPEAL_RESOLVED") && (
        <p className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-ink-muted">
          This request is closed. It remains in the archive as a permanent
          record.
        </p>
      )}

      <NoteForm slug={slug} id={id} />
    </div>
  );
}

function DecisionBlock({
  slug,
  id,
  status,
}: {
  slug: string;
  id: string;
  status: RequestStatus;
}) {
  const reviewAction = setUnderReview.bind(null, slug, id);
  const approveAction = approve.bind(null, slug, id);
  const [reviewState, reviewFormAction] = useActionState(
    async () => reviewAction(),
    {} as ActionState
  );
  const [approveState, approveFormAction] = useActionState(
    async () => approveAction(),
    {} as ActionState
  );

  return (
    <div className="space-y-3">
      {status === "PENDING" && (
        <form action={reviewFormAction}>
          <button className="btn-secondary w-full">
            <Pending>Move to Under Review</Pending>
          </button>
          <ErrorLine state={reviewState} />
        </form>
      )}
      <form action={approveFormAction}>
        <button className="btn-primary w-full bg-green-700 hover:bg-green-800 focus:ring-green-600">
          <Pending>Approve request</Pending>
        </button>
        <ErrorLine state={approveState} />
      </form>
      <DenyForm slug={slug} id={id} />
    </div>
  );
}

function DenyForm({ slug, id }: { slug: string; id: string }) {
  const action = deny.bind(null, slug, id);
  const [state, formAction] = useActionState(action, {} as ActionState);

  return (
    <details className="rounded-md border border-red-200 bg-red-50/50">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-red-800">
        Deny request…
      </summary>
      <form action={formAction} className="space-y-3 p-3 pt-0">
        <p className="text-xs text-ink-soft">
          Texas Property Code §209.00505 requires the denial notice to state the
          specific reasons and describe what changes would gain approval.
        </p>
        <div>
          <label className="label" htmlFor="denialReasons">
            Specific reasons for denial<span className="text-red-600">*</span>
          </label>
          <textarea
            id="denialReasons"
            name="denialReasons"
            className="input min-h-24"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="denialRequiredChanges">
            Changes that would result in approval
            <span className="text-red-600">*</span>
          </label>
          <textarea
            id="denialRequiredChanges"
            name="denialRequiredChanges"
            className="input min-h-20"
            placeholder='If none, enter "None."'
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="denialNoticeDate">
              Notice date
            </label>
            <input
              id="denialNoticeDate"
              name="denialNoticeDate"
              type="date"
              className="input"
              defaultValue={todayInputValue()}
            />
          </div>
          <div>
            <label className="label" htmlFor="denialDeliveryMethod">
              Delivery method<span className="text-red-600">*</span>
            </label>
            <select
              id="denialDeliveryMethod"
              name="denialDeliveryMethod"
              className="input"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Choose…
              </option>
              {DELIVERY_METHOD_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn-danger w-full">
          <Pending>Confirm denial</Pending>
        </button>
        <ErrorLine state={state} />
      </form>
    </details>
  );
}

function RequestAppealForm({ slug, id }: { slug: string; id: string }) {
  const action = requestAppeal.bind(null, slug, id);
  const [state, formAction] = useActionState(action, {} as ActionState);
  return (
    <form action={formAction} className="card space-y-3 p-4">
      <p className="text-sm font-medium text-ink">Record hearing request</p>
      <p className="text-xs text-ink-soft">
        Log the date the homeowner requested a board hearing. This starts the
        30-day hearing clock.
      </p>
      <div>
        <label className="label" htmlFor="appealRequestedAt">
          Date requested
        </label>
        <input
          id="appealRequestedAt"
          name="appealRequestedAt"
          type="date"
          className="input"
          defaultValue={todayInputValue()}
        />
      </div>
      <button className="btn-primary w-full">
        <Pending>Record appeal request</Pending>
      </button>
      <ErrorLine state={state} />
    </form>
  );
}

function ScheduleHearingForm({ slug, id }: { slug: string; id: string }) {
  const action = scheduleHearing.bind(null, slug, id);
  const [state, formAction] = useActionState(action, {} as ActionState);
  return (
    <form action={formAction} className="card space-y-3 p-4">
      <p className="text-sm font-medium text-ink">Schedule the hearing</p>
      <div>
        <label className="label" htmlFor="hearingScheduledAt">
          Hearing date &amp; time<span className="text-red-600">*</span>
        </label>
        <input
          id="hearingScheduledAt"
          name="hearingScheduledAt"
          type="datetime-local"
          className="input"
          required
        />
      </div>
      <button className="btn-primary w-full">
        <Pending>Schedule hearing</Pending>
      </button>
      <ErrorLine state={state} />
    </form>
  );
}

function ResolveAppealForm({ slug, id }: { slug: string; id: string }) {
  const action = resolveAppeal.bind(null, slug, id);
  const [state, formAction] = useActionState(action, {} as ActionState);
  return (
    <form action={formAction} className="card space-y-3 p-4">
      <p className="text-sm font-medium text-ink">Resolve appeal</p>
      <div>
        <label className="label" htmlFor="appealResolution">
          Outcome of the hearing<span className="text-red-600">*</span>
        </label>
        <textarea
          id="appealResolution"
          name="appealResolution"
          className="input min-h-24"
          required
          placeholder="e.g. Board upheld the denial / Board approved with conditions…"
        />
      </div>
      <button className="btn-primary w-full">
        <Pending>Record resolution &amp; close</Pending>
      </button>
      <ErrorLine state={state} />
    </form>
  );
}

function NoteForm({ slug, id }: { slug: string; id: string }) {
  const action = addNote.bind(null, slug, id);
  const [state, formAction] = useActionState(action, {} as ActionState);
  return (
    <form action={formAction} className="border-t border-gray-100 pt-4">
      <label className="label" htmlFor="note">
        Add a note to the activity log
      </label>
      <textarea id="note" name="note" className="input min-h-16" />
      <button className="btn-secondary mt-2 w-full">
        <Pending>Add note</Pending>
      </button>
      <ErrorLine state={state} />
    </form>
  );
}
