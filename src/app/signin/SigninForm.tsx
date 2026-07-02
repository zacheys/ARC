"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { goToDashboard, type SigninState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Continuing…" : "Continue"}
    </button>
  );
}

export default function SigninForm() {
  const [state, formAction] = useActionState<SigninState, FormData>(
    goToDashboard,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}
      <div>
        <label className="label" htmlFor="slug">
          Association web address name
        </label>
        <input
          id="slug"
          name="slug"
          className="input"
          required
          autoFocus
          placeholder="e.g. oak-ridge"
        />
        <p className="mt-1 text-xs text-ink-muted">
          This is the short name in your dashboard link, such as{" "}
          <code>oak-ridge</code> in <code>/dashboard/oak-ridge</code>.
        </p>
      </div>
      <SubmitButton />
    </form>
  );
}
