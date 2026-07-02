"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export default function LoginForm({
  slug,
  from,
}: {
  slug: string;
  from?: string;
}) {
  const action = login.bind(null, slug);
  const [state, formAction] = useActionState<LoginState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}
      <input type="hidden" name="from" value={from ?? ""} />
      <div>
        <label className="label" htmlFor="password">
          Committee password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          autoFocus
          autoComplete="current-password"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
