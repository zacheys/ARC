"use server";

import { redirect } from "next/navigation";
import type { RequestType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { buildReferenceNumber } from "@/lib/reference";
import { computeReviewDeadline } from "@/lib/deadlines";
import {
  MAX_FILES,
  SUBMISSION_IMAGE_TYPES,
  SUBMISSION_MAX_FILE_BYTES,
  isSubmissionBlobUrl,
} from "@/lib/blob";
import { sendEmail } from "@/lib/email";
import {
  homeownerConfirmationEmail,
  committeeNotificationEmail,
} from "@/lib/email-templates";
import { REQUEST_TYPE_LABELS } from "@/lib/labels";
import { getBaseUrl } from "@/lib/url";

const VALID_TYPES: RequestType[] = [
  "FENCE",
  "PAINT",
  "ROOF",
  "ADDITION",
  "LANDSCAPING",
  "SOLAR",
  "OTHER",
];

export interface SubmitState {
  error?: string;
}

interface ValidAttachment {
  url: string;
  pathname: string;
  contentType: string;
  filename: string;
  size: number;
}

/**
 * Parse + validate client-supplied attachment metadata. Only keeps entries
 * whose URL is genuinely in our Blob store under submissions/, with an allowed
 * image type and a sane size — never trusts the client blindly.
 */
function parseAttachments(raw: FormDataEntryValue | null): ValidAttachment[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: ValidAttachment[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const { url, pathname, contentType, filename, size } = item as Record<
      string,
      unknown
    >;
    if (
      typeof url === "string" &&
      isSubmissionBlobUrl(url) &&
      typeof contentType === "string" &&
      SUBMISSION_IMAGE_TYPES.includes(contentType) &&
      typeof filename === "string" &&
      filename.length > 0 &&
      typeof size === "number" &&
      size > 0 &&
      size <= SUBMISSION_MAX_FILE_BYTES
    ) {
      out.push({
        url,
        pathname: typeof pathname === "string" ? pathname : "",
        contentType,
        filename: filename.slice(0, 255),
        size,
      });
    }
  }
  return out;
}

export async function submitRequest(
  slug: string,
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const homeownerName = String(formData.get("homeownerName") || "").trim();
  const homeownerEmail = String(formData.get("homeownerEmail") || "").trim();
  const homeownerPhone = String(formData.get("homeownerPhone") || "").trim();
  const propertyAddress = String(formData.get("propertyAddress") || "").trim();
  const requestType = String(formData.get("requestType") || "") as RequestType;
  const description = String(formData.get("description") || "").trim();

  // Validation
  if (!homeownerName) return { error: "Please enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(homeownerEmail))
    return { error: "Please enter a valid email address." };
  if (!propertyAddress) return { error: "Please enter the property address." };
  if (!VALID_TYPES.includes(requestType))
    return { error: "Please choose a request type." };
  if (!description || description.length < 10)
    return {
      error: "Please describe your request (at least a sentence).",
    };

  // Photos are uploaded directly to Blob from the browser; the form submits
  // only their metadata. Validate that each URL is really in our Blob store.
  const attachments = parseAttachments(formData.get("attachments"));
  if (attachments.length > MAX_FILES)
    return { error: `Please attach at most ${MAX_FILES} photos.` };

  const hoa = await prisma.hoa.findUnique({ where: { slug } });
  if (!hoa) return { error: "Association not found." };

  const submittedAt = new Date();
  const reviewDeadlineAt = computeReviewDeadline(
    submittedAt,
    hoa.reviewDeadlineDays
  );

  // Reserve a reference number + create the request atomically.
  const request = await prisma.$transaction(async (tx) => {
    const updated = await tx.hoa.update({
      where: { id: hoa.id },
      data: { referenceSeq: { increment: 1 } },
      select: { referenceSeq: true },
    });
    const referenceNumber = buildReferenceNumber(
      hoa.slug,
      updated.referenceSeq,
      submittedAt
    );
    return tx.request.create({
      data: {
        hoaId: hoa.id,
        referenceNumber,
        homeownerName,
        homeownerEmail,
        homeownerPhone: homeownerPhone || null,
        propertyAddress,
        requestType,
        description,
        submittedAt,
        reviewDeadlineAt,
      },
    });
  });

  await logActivity(
    request.id,
    "SUBMITTED",
    `Request submitted by ${homeownerName}.`,
    { actor: "homeowner" }
  );

  // Persist attachment metadata for the (already-uploaded) Blob objects.
  if (attachments.length > 0) {
    await prisma.attachment.createMany({
      data: attachments.map((a) => ({
        requestId: request.id,
        url: a.url,
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
      })),
    });
  }

  // Emails (homeowner confirmation + committee notification)
  const baseUrl = await getBaseUrl();
  const requestTypeLabel = REQUEST_TYPE_LABELS[requestType];
  const detailUrl = `${baseUrl}/dashboard/${hoa.slug}/requests/${request.id}`;

  const confirmation = homeownerConfirmationEmail({
    hoaName: hoa.name,
    homeownerName,
    referenceNumber: request.referenceNumber,
    requestTypeLabel,
    propertyAddress,
    reviewDeadlineAt,
  });
  await sendEmail({ to: homeownerEmail, ...confirmation });

  if (hoa.committeeEmails.length > 0) {
    const notify = committeeNotificationEmail({
      hoaName: hoa.name,
      homeownerName,
      referenceNumber: request.referenceNumber,
      requestTypeLabel,
      propertyAddress,
      reviewDeadlineAt,
      detailUrl,
    });
    await sendEmail({ to: hoa.committeeEmails, ...notify });
  }

  await logActivity(request.id, "EMAIL_SENT", "Confirmation emails sent.", {
    actor: "system",
  });

  redirect(`/submit/${slug}/confirmation?ref=${request.referenceNumber}`);
}
