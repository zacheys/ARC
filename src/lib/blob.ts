import { put } from "@vercel/blob";

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB (committee logo path)
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

// --------------------------------------------------------------------------
// Public homeowner submission uploads (direct browser -> Blob, client uploads)
// These constants are shared by the client form, the /api/blob/upload route,
// and the submit server action so limits stay consistent everywhere.
// --------------------------------------------------------------------------

/** Homeowner submissions are photos only — no PDFs on the public form. */
export const SUBMISSION_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

/** Max size per uploaded photo (after any client-side downscaling). */
export const SUBMISSION_MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

/** Files above this are downscaled client-side before upload. */
export const COMPRESS_THRESHOLD_BYTES = 2 * 1024 * 1024; // 2 MB

/** All submission blobs live under this key prefix. */
export const SUBMISSION_PREFIX = "submissions";

export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * True when `url` is a Vercel Blob URL in our store under the submissions/
 * prefix — used to validate client-supplied attachment URLs server-side.
 */
export function isSubmissionBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com") &&
      u.pathname.startsWith(`/${SUBMISSION_PREFIX}/`)
    );
  } catch {
    return false;
  }
}

export interface UploadedFile {
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

/**
 * Upload a single file to Vercel Blob under a keyed prefix.
 * Throws if the blob token is missing or the file violates limits.
 */
export async function uploadFile(
  file: File,
  prefix: string
): Promise<UploadedFile> {
  if (!isBlobConfigured()) {
    throw new Error(
      "File uploads require BLOB_READ_WRITE_TOKEN. Set it to enable uploads."
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} exceeds the 10MB limit.`);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${prefix}/${Date.now()}-${safeName}`;

  const blob = await put(key, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || "application/octet-stream",
  });

  return {
    url: blob.url,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    size: file.size,
  };
}
