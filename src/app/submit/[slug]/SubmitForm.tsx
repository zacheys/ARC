"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitRequest, type SubmitState } from "./actions";
import { REQUEST_TYPE_OPTIONS } from "@/lib/labels";
import { MAX_FILES } from "@/lib/blob";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Submitting…" : "Submit request"}
    </button>
  );
}

export default function SubmitForm({ slug }: { slug: string }) {
  const action = submitRequest.bind(null, slug);
  const [state, formAction] = useActionState<SubmitState, FormData>(action, {});
  const [fileError, setFileError] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return setFileError(null);
    if (files.length > MAX_FILES) {
      setFileError(`Please attach at most ${MAX_FILES} files.`);
    } else if (Array.from(files).some((f) => f.size > 10 * 1024 * 1024)) {
      setFileError("Each file must be 10MB or smaller.");
    } else {
      setFileError(null);
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="homeownerName">
            Full name<span className="text-red-600">*</span>
          </label>
          <input
            id="homeownerName"
            name="homeownerName"
            className="input"
            required
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label" htmlFor="homeownerEmail">
            Email<span className="text-red-600">*</span>
          </label>
          <input
            id="homeownerEmail"
            name="homeownerEmail"
            type="email"
            className="input"
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="homeownerPhone">
            Phone
          </label>
          <input
            id="homeownerPhone"
            name="homeownerPhone"
            type="tel"
            className="input"
            autoComplete="tel"
          />
        </div>
        <div>
          <label className="label" htmlFor="requestType">
            Request type<span className="text-red-600">*</span>
          </label>
          <select id="requestType" name="requestType" className="input" required defaultValue="">
            <option value="" disabled>
              Choose one…
            </option>
            {REQUEST_TYPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="propertyAddress">
          Property address<span className="text-red-600">*</span>
        </label>
        <input
          id="propertyAddress"
          name="propertyAddress"
          className="input"
          required
          autoComplete="street-address"
          placeholder="123 Oak Street, Austin, TX 78701"
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          Describe your request<span className="text-red-600">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          className="input min-h-32"
          required
          placeholder="Materials, colors, dimensions, placement, contractor, and any relevant details."
        />
      </div>

      <div>
        <label className="label" htmlFor="files">
          Photos or documents
        </label>
        <input
          id="files"
          name="files"
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={onFileChange}
          className="block w-full text-sm text-ink-soft file:mr-4 file:rounded-md file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-800"
        />
        <p className="mt-1 text-xs text-ink-muted">
          Up to {MAX_FILES} files, 10MB each. Images or PDF.
        </p>
        {fileError && (
          <p className="mt-1 text-xs text-red-600">{fileError}</p>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
