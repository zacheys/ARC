import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  SUBMISSION_IMAGE_TYPES,
  SUBMISSION_MAX_FILE_BYTES,
  SUBMISSION_PREFIX,
} from "@/lib/blob";

export const runtime = "nodejs";

/**
 * Client-upload token endpoint for the public homeowner submission form.
 * Files go directly from the browser to Vercel Blob (bypassing the ~4.5MB
 * server-action body limit). This route only mints scoped upload tokens.
 *
 * Intentionally NO auth — it serves the public /submit/[slug] form. Abuse is
 * bounded by: image-only content types, a 15MB cap, and a fixed submissions/
 * pathname prefix.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(`${SUBMISSION_PREFIX}/`)) {
          throw new Error("Uploads must be under the submissions/ prefix.");
        }
        return {
          allowedContentTypes: SUBMISSION_IMAGE_TYPES,
          maximumSizeInBytes: SUBMISSION_MAX_FILE_BYTES,
          addRandomSuffix: true,
        };
      },
      // Fires via Vercel webhook after upload completes. We persist the
      // Attachment rows when the form is submitted instead, so nothing to do
      // here. (Not invoked for localhost uploads.)
      onUploadCompleted: async () => {},
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
