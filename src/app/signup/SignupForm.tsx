"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signup, type SignupState } from "./actions";
import { slugify } from "@/lib/slug";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Creating your account…" : "Start free trial"}
    </button>
  );
}

export default function SignupForm() {
  const [state, formAction] = useActionState<SignupState, FormData>(signup, {});
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  function onNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugTouched) setSlug(slugify(e.target.value));
  }

  if (state.success) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold text-ink">Check your email</h2>
        <p className="mt-2 text-sm text-ink-soft">
          {state.success.email
            ? `We sent a verification link to ${state.success.email}. `
            : "If that email is valid, we've sent a verification link. "}
          Click the link to activate your dashboard and begin your 30-day free
          trial.
        </p>
        <p className="mt-4 text-xs text-ink-muted">
          In development, the email is printed to the server console instead of
          being sent.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {/* Honeypot: hidden from users, ignored by real submissions. */}
      <div className="hidden" aria-hidden>
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label className="label" htmlFor="name">
          Association name
        </label>
        <input
          id="name"
          name="name"
          className="input"
          required
          onChange={onNameChange}
          placeholder="Oak Ridge Homeowners Association"
        />
      </div>

      <div>
        <label className="label" htmlFor="slug">
          Web address
        </label>
        <div className="flex items-center rounded-md border border-gray-300 bg-white focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600">
          <span className="pl-3 text-sm text-ink-muted">/dashboard/</span>
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            required
            className="w-full rounded-md border-0 bg-transparent px-1 py-2 text-sm text-ink focus:outline-none focus:ring-0"
            placeholder="oak-ridge"
          />
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Lowercase letters, numbers, and hyphens. This is your dashboard&rsquo;s
          web address.
        </p>
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
        />
      </div>

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
          minLength={10}
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-ink-muted">At least 10 characters.</p>
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
          minLength={10}
          autoComplete="new-password"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
