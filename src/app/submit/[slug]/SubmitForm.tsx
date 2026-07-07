"use client";

import { useActionState, useCallback, useState } from "react";
import { useFormStatus } from "react-dom";
import { upload } from "@vercel/blob/client";
import { submitRequest, type SubmitState } from "./actions";
import { REQUEST_TYPE_OPTIONS } from "@/lib/labels";
import {
  MAX_FILES,
  SUBMISSION_IMAGE_TYPES,
  SUBMISSION_MAX_FILE_BYTES,
  SUBMISSION_PREFIX,
} from "@/lib/blob";
import { maybeCompressImage } from "@/lib/image-compress";

interface AttachmentResult {
  url: string;
  pathname: string;
  contentType: string;
  filename: string;
  size: number;
}

type UploadStatus = "compressing" | "uploading" | "done" | "error";

interface UploadItem {
  id: string;
  fileName: string;
  source: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  result?: AttachmentResult;
}

/** Resolve an allowed content type, tolerating browsers that report HEIC as "". */
function resolveType(file: File): string | null {
  if (SUBMISSION_IMAGE_TYPES.includes(file.type)) return file.type;
  if (file.type === "") {
    if (/\.(heic|heif)$/i.test(file.name)) return "image/heic";
    if (/\.jpe?g$/i.test(file.name)) return "image/jpeg";
    if (/\.png$/i.test(file.name)) return "image/png";
    if (/\.webp$/i.test(file.name)) return "image/webp";
  }
  return null;
}

const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

function SubmitButton({ blocked }: { blocked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-primary w-full"
      disabled={pending || blocked}
    >
      {pending ? "Submitting…" : blocked ? "Waiting for photos…" : "Submit request"}
    </button>
  );
}

export default function SubmitForm({ slug }: { slug: string }) {
  const action = submitRequest.bind(null, slug);
  const [state, formAction] = useActionState<SubmitState, FormData>(action, {});
  const [items, setItems] = useState<UploadItem[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const update = useCallback(
    (id: string, patch: Partial<UploadItem>) =>
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
      ),
    []
  );

  const processItem = useCallback(
    async (id: string, source: File) => {
      const contentType = resolveType(source);
      if (!contentType) {
        update(id, { status: "error", error: "Unsupported file type." });
        return;
      }
      try {
        update(id, { status: "compressing", progress: 0, error: undefined });
        const file = await maybeCompressImage(source);
        const finalType = SUBMISSION_IMAGE_TYPES.includes(file.type)
          ? file.type
          : contentType;

        if (file.size > SUBMISSION_MAX_FILE_BYTES) {
          update(id, {
            status: "error",
            error: "Still over 15MB after compression. Try a smaller photo.",
          });
          return;
        }

        update(id, { status: "uploading", progress: 0 });
        const blob = await upload(
          `${SUBMISSION_PREFIX}/${sanitize(file.name)}`,
          file,
          {
            access: "public",
            contentType: finalType,
            handleUploadUrl: "/api/blob/upload",
            onUploadProgress: (p) => update(id, { progress: p.percentage }),
          }
        );

        update(id, {
          status: "done",
          progress: 100,
          result: {
            url: blob.url,
            pathname: blob.pathname,
            contentType: finalType,
            filename: source.name,
            size: file.size,
          },
        });
      } catch (e) {
        update(id, {
          status: "error",
          error: e instanceof Error ? e.message : "Upload failed.",
        });
      }
    },
    [update]
  );

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file
    if (picked.length === 0) return;

    const room = MAX_FILES - items.length;
    if (room <= 0) {
      setFileError(`You can attach at most ${MAX_FILES} photos.`);
      return;
    }
    const toAdd = picked.slice(0, room);
    if (picked.length > room) {
      setFileError(`Only ${MAX_FILES} photos allowed; extra files were skipped.`);
    }

    const newItems: UploadItem[] = [];
    for (const file of toAdd) {
      if (!resolveType(file)) {
        setFileError("Photos must be JPEG, PNG, WebP, or HEIC.");
        continue;
      }
      newItems.push({
        id: crypto.randomUUID(),
        fileName: file.name,
        source: file,
        status: "compressing",
        progress: 0,
      });
    }
    if (newItems.length === 0) return;
    setItems((prev) => [...prev, ...newItems]);
    for (const it of newItems) processItem(it.id, it.source);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  const uploading = items.some(
    (it) => it.status === "compressing" || it.status === "uploading"
  );
  const hasErrors = items.some((it) => it.status === "error");
  const attachments = items
    .filter((it) => it.status === "done" && it.result)
    .map((it) => it.result as AttachmentResult);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {/* Uploaded photo metadata travels as JSON, not file bytes. */}
      <input type="hidden" name="attachments" value={JSON.stringify(attachments)} />

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
          Photos
        </label>
        <input
          id="files"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          onChange={onFileChange}
          disabled={items.length >= MAX_FILES}
          className="block w-full text-sm text-ink-soft file:mr-4 file:rounded-md file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-800 disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-ink-muted">
          Up to {MAX_FILES} photos, 15MB each. JPEG, PNG, WebP, or HEIC. Large
          photos are automatically resized.
        </p>
        {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}

        {items.length > 0 && (
          <ul className="mt-3 space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {it.fileName}
                  </span>
                  <span className="shrink-0 text-xs">
                    {it.status === "done" && (
                      <span className="text-green-700">Uploaded ✓</span>
                    )}
                    {it.status === "uploading" && (
                      <span className="text-ink-muted">{it.progress}%</span>
                    )}
                    {it.status === "compressing" && (
                      <span className="text-ink-muted">Preparing…</span>
                    )}
                    {it.status === "error" && (
                      <span className="text-red-600">Failed</span>
                    )}
                  </span>
                  <div className="flex shrink-0 gap-2">
                    {it.status === "error" && (
                      <button
                        type="button"
                        onClick={() => processItem(it.id, it.source)}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        Retry
                      </button>
                    )}
                    {it.status !== "uploading" && it.status !== "compressing" && (
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="text-xs text-ink-muted hover:text-ink"
                        aria-label={`Remove ${it.fileName}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {(it.status === "uploading" || it.status === "compressing") && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand-700 transition-[width]"
                      style={{
                        width:
                          it.status === "uploading" ? `${it.progress}%` : "15%",
                      }}
                    />
                  </div>
                )}
                {it.status === "error" && it.error && (
                  <p className="mt-1 text-xs text-red-600">{it.error}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {hasErrors && (
          <p className="mt-2 text-xs text-red-600">
            Some photos didn&rsquo;t upload. Retry or remove them before
            submitting — the rest of your form is saved.
          </p>
        )}
      </div>

      <SubmitButton blocked={uploading || hasErrors} />
    </form>
  );
}
