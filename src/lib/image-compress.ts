// Browser-only image downscaling for the submission form. Import from client
// components only (uses Image/canvas). Keeps big phone photos under the size
// cap and speeds up uploads.

import { COMPRESS_THRESHOLD_BYTES } from "./blob";

const MAX_EDGE = 2000; // longest edge, px
const JPEG_QUALITY = 0.8;

/** Canvas can reliably decode these; HEIC/HEIF usually cannot, so we skip it. */
const CANVAS_DECODABLE = ["image/jpeg", "image/png", "image/webp"];

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

/**
 * Downscale a photo if it's large and browser-decodable. Returns a new JPEG
 * File, or the original file unchanged when compression isn't applicable
 * (small file, HEIC the browser can't decode, or no size win).
 */
export async function maybeCompressImage(file: File): Promise<File> {
  if (file.size <= COMPRESS_THRESHOLD_BYTES) return file;
  if (!CANVAS_DECODABLE.includes(file.type)) return file; // e.g. HEIC → as-is

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file; // no win → keep original

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file; // decode/encode failed → upload original
  }
}
