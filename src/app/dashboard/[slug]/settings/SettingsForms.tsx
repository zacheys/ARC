"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateSettings,
  changePassword,
  type SettingsState,
} from "./actions";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

function Alert({ state }: { state: SettingsState }) {
  if (state.error)
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {state.error}
      </div>
    );
  if (state.ok)
    return (
      <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        {state.ok}
      </div>
    );
  return null;
}

export function SettingsForm({
  slug,
  name,
  committeeEmails,
  reviewDeadlineDays,
  logoUrl,
  blobConfigured,
}: {
  slug: string;
  name: string;
  committeeEmails: string[];
  reviewDeadlineDays: number;
  logoUrl: string | null;
  blobConfigured: boolean;
}) {
  const action = updateSettings.bind(null, slug);
  const [state, formAction] = useActionState(action, {} as SettingsState);

  return (
    <form action={formAction} className="space-y-5">
      <Alert state={state} />
      <div>
        <label className="label" htmlFor="name">
          Association name
        </label>
        <input id="name" name="name" defaultValue={name} className="input" required />
      </div>

      <div>
        <label className="label" htmlFor="committeeEmails">
          Committee email(s)
        </label>
        <textarea
          id="committeeEmails"
          name="committeeEmails"
          defaultValue={committeeEmails.join("\n")}
          className="input min-h-20"
          placeholder="one@example.com, two@example.com"
        />
        <p className="mt-1 text-xs text-ink-muted">
          Separate multiple addresses with commas or new lines. These receive
          new-submission notifications and deadline reminders.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="reviewDeadlineDays">
          Review deadline (days)
        </label>
        <input
          id="reviewDeadlineDays"
          name="reviewDeadlineDays"
          type="number"
          min={1}
          max={365}
          defaultValue={reviewDeadlineDays}
          className="input max-w-32"
          required
        />
        <p className="mt-1 text-xs text-ink-muted">
          Days from submission to a decision, per your CC&amp;Rs. Applies to new
          submissions.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="logo">
          Letterhead logo
        </label>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt="Current logo"
            className="mb-2 h-16 w-16 rounded border border-gray-200 object-contain"
          />
        ) : null}
        <input
          id="logo"
          name="logo"
          type="file"
          accept="image/*"
          disabled={!blobConfigured}
          className="block w-full text-sm text-ink-soft file:mr-4 file:rounded-md file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-800 disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-ink-muted">
          {blobConfigured
            ? "Appears on denial letters. Leave empty to keep the current logo."
            : "Set BLOB_READ_WRITE_TOKEN to enable logo uploads."}
        </p>
      </div>

      <SaveButton label="Save settings" />
    </form>
  );
}

export function PasswordForm({ slug }: { slug: string }) {
  const action = changePassword.bind(null, slug);
  const [state, formAction] = useActionState(action, {} as SettingsState);
  return (
    <form action={formAction} className="space-y-4">
      <Alert state={state} />
      <div>
        <label className="label" htmlFor="newPassword">
          New committee password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          className="input"
          required
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="label" htmlFor="confirmPassword">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className="input"
          required
          autoComplete="new-password"
        />
      </div>
      <SaveButton label="Update password" />
    </form>
  );
}
