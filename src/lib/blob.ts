import { put } from "@vercel/blob";

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
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
