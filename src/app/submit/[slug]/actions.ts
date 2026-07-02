"use server";

import { redirect } from "next/navigation";
import type { RequestType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { buildReferenceNumber } from "@/lib/reference";
import { computeReviewDeadline } from "@/lib/deadlines";
import { uploadFile, isBlobConfigured, MAX_FILES } from "@/lib/blob";
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

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length > MAX_FILES)
    return { error: `Please attach at most ${MAX_FILES} files.` };

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

  // Upload attachments (best effort — dev without a Blob token still works).
  if (files.length > 0) {
    if (isBlobConfigured()) {
      for (const file of files) {
        try {
          const uploaded = await uploadFile(file, `requests/${request.id}`);
          await prisma.attachment.create({
            data: { requestId: request.id, ...uploaded },
          });
        } catch (e) {
          console.error("Attachment upload failed:", e);
        }
      }
    } else {
      await logActivity(
        request.id,
        "NOTE",
        `${files.length} file(s) were submitted but not stored (Blob storage not configured in this environment).`,
        { actor: "system" }
      );
    }
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
