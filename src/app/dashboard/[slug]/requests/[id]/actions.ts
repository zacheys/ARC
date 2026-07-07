"use server";

import React from "react";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DeliveryMethod, RequestType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import {
  computeAppealWindow,
  computeHearingDeadline,
  formatDate,
  formatDateTime,
} from "@/lib/deadlines";
import {
  STATUS_LABELS,
  DELIVERY_METHOD_LABELS,
  REQUEST_TYPE_LABELS,
} from "@/lib/labels";
import { sendEmail } from "@/lib/email";
import { denialNoticeEmail } from "@/lib/email-templates";
import { buildDenialLetter } from "@/lib/letter";
import { DenialLetterDocument } from "@/lib/DenialLetterPdf";

export interface ActionState {
  error?: string;
  ok?: boolean;
  /** Denial saved, but the electronic notice email did not go out. */
  warning?: string;
}

/** Load a request and confirm it belongs to the authenticated HOA. */
async function authorize(slug: string, requestId: string) {
  const session = await getSession(slug);
  if (!session) return { error: "Not authenticated." as const };
  const request = await prisma.request.findFirst({
    where: { id: requestId, hoaId: session.hoaId },
    include: { hoa: true },
  });
  if (!request) return { error: "Request not found." as const };
  return { request };
}

function refresh(slug: string, id: string) {
  revalidatePath(`/dashboard/${slug}/requests/${id}`);
  revalidatePath(`/dashboard/${slug}`);
  revalidatePath(`/dashboard/${slug}/archive`);
}

interface DenialNoticeInput {
  id: string;
  referenceNumber: string;
  requestType: RequestType;
  homeownerName: string;
  homeownerEmail: string;
  propertyAddress: string;
  hoa: { name: string; logoUrl: string | null };
}

interface DenialFacts {
  denialReasons: string;
  denialRequiredChanges: string;
  denialNoticeDate: Date;
  deliveryMethod: DeliveryMethod;
  appealRequestWindowAt: Date;
}

/**
 * Email the electronic denial notice (with the PDF letter attached) to the
 * homeowner. On success: store the Resend message id + log DENIAL_EMAIL_SENT.
 * On failure: log a NOTE and return a warning — the denial itself stays saved.
 */
async function sendElectronicDenialNotice(
  r: DenialNoticeInput,
  d: DenialFacts
): Promise<{ warning?: string }> {
  try {
    const letter = buildDenialLetter(
      {
        homeownerName: r.homeownerName,
        propertyAddress: r.propertyAddress,
        referenceNumber: r.referenceNumber,
        requestType: r.requestType,
        denialReasons: d.denialReasons,
        denialRequiredChanges: d.denialRequiredChanges,
        denialNoticeDate: d.denialNoticeDate,
        denialDeliveryMethod: d.deliveryMethod,
        appealRequestWindowAt: d.appealRequestWindowAt,
      },
      r.hoa
    );
    const pdf = await renderToBuffer(
      React.createElement(DenialLetterDocument, { letter }) as Parameters<
        typeof renderToBuffer
      >[0]
    );

    const email = denialNoticeEmail({
      hoaName: r.hoa.name,
      homeownerName: r.homeownerName,
      referenceNumber: r.referenceNumber,
      propertyAddress: r.propertyAddress,
      requestTypeLabel: REQUEST_TYPE_LABELS[r.requestType],
      denialReasons: d.denialReasons,
      denialRequiredChanges: d.denialRequiredChanges,
      noticeDate: d.denialNoticeDate,
      appealDeadline: d.appealRequestWindowAt,
    });

    const res = await sendEmail({
      to: r.homeownerEmail,
      ...email,
      attachments: [
        { filename: `denial-${r.referenceNumber}.pdf`, content: pdf },
      ],
    });

    // In dev (no RESEND_API_KEY) the stub returns id "dev-stub" — treat as sent
    // so the flow is testable; a real failure carries res.error.
    const delivered = res.sent || res.id === "dev-stub";
    if (!delivered) {
      throw new Error(res.error ?? "Email provider did not confirm delivery.");
    }

    await prisma.request.update({
      where: { id: r.id },
      data: { denialEmailMessageId: res.id ?? null, denialEmailSentAt: new Date() },
    });
    await logActivity(
      r.id,
      "DENIAL_EMAIL_SENT",
      `Denial notice emailed to ${r.homeownerEmail} (electronic delivery).`,
      { actor: "system", metadata: res.id ? { messageId: res.id } : undefined }
    );
    return {};
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    await logActivity(
      r.id,
      "NOTE",
      `⚠️ Electronic denial notice could NOT be emailed to ${r.homeownerEmail}: ${msg}. The denial is recorded — please deliver the notice by another method.`,
      { actor: "system" }
    );
    return {
      warning: `The denial was saved, but the electronic notice email failed to send (${msg}). Please deliver the notice another way.`,
    };
  }
}

export async function setUnderReview(
  slug: string,
  id: string
): Promise<ActionState> {
  const auth = await authorize(slug, id);
  if ("error" in auth) return { error: auth.error };
  if (auth.request.status !== "PENDING")
    return { error: "Only pending requests can be moved to review." };

  await prisma.request.update({
    where: { id },
    data: { status: "UNDER_REVIEW" },
  });
  await logActivity(id, "STATUS_CHANGE", "Moved to Under Review.", {
    actor: "committee",
  });
  refresh(slug, id);
  return { ok: true };
}

export async function approve(slug: string, id: string): Promise<ActionState> {
  const auth = await authorize(slug, id);
  if ("error" in auth) return { error: auth.error };
  if (!["PENDING", "UNDER_REVIEW"].includes(auth.request.status))
    return { error: "This request cannot be approved from its current status." };

  await prisma.request.update({
    where: { id },
    data: { status: "APPROVED", decisionAt: new Date() },
  });
  await logActivity(id, "STATUS_CHANGE", "Request APPROVED.", {
    actor: "committee",
  });

  const r = auth.request;
  await sendEmail({
    to: r.homeownerEmail,
    subject: `Your architectural request was approved — ${r.referenceNumber}`,
    html: `<p>Dear ${r.homeownerName},</p><p>Your architectural request <strong>${r.referenceNumber}</strong> for ${r.propertyAddress} has been <strong>approved</strong> by the ${r.hoa.name} Architectural Review Committee.</p>`,
  });
  await logActivity(id, "EMAIL_SENT", "Approval notice emailed to homeowner.", {
    actor: "system",
  });

  refresh(slug, id);
  return { ok: true };
}

export async function deny(
  slug: string,
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(slug, id);
  if ("error" in auth) return { error: auth.error };
  if (!["PENDING", "UNDER_REVIEW"].includes(auth.request.status))
    return { error: "This request cannot be denied from its current status." };

  const denialReasons = String(formData.get("denialReasons") || "").trim();
  const denialRequiredChanges = String(
    formData.get("denialRequiredChanges") || ""
  ).trim();
  const deliveryMethod = String(
    formData.get("denialDeliveryMethod") || ""
  ) as DeliveryMethod;
  const noticeDateRaw = String(formData.get("denialNoticeDate") || "").trim();

  if (!denialReasons)
    return { error: "Specific reasons for denial are required (§209.00505)." };
  if (!denialRequiredChanges)
    return {
      error:
        "You must state what changes, if any, would gain approval (§209.00505). Enter “None” if not applicable.",
    };
  if (!DELIVERY_METHOD_LABELS[deliveryMethod])
    return { error: "Select how the denial notice will be delivered." };

  const denialNoticeDate = noticeDateRaw ? new Date(noticeDateRaw) : new Date();
  if (Number.isNaN(denialNoticeDate.getTime()))
    return { error: "Invalid denial notice date." };

  const appealRequestWindowAt = computeAppealWindow(denialNoticeDate);

  await prisma.request.update({
    where: { id },
    data: {
      status: "DENIED",
      decisionAt: new Date(),
      denialReasons,
      denialRequiredChanges,
      denialDeliveryMethod: deliveryMethod,
      denialNoticeDate,
      appealRequestWindowAt,
    },
  });

  await logActivity(
    id,
    "DENIAL_ISSUED",
    `Request DENIED. Notice dated ${formatDate(denialNoticeDate)}, delivered via ${DELIVERY_METHOD_LABELS[deliveryMethod]}. Owner may request a hearing until ${formatDate(appealRequestWindowAt)}.`,
    { actor: "committee", metadata: { deliveryMethod } }
  );

  // Electronic delivery: email the homeowner the notice + PDF. Certified mail
  // and hand delivery are handled out-of-band (no email).
  let warning: string | undefined;
  if (deliveryMethod === "ELECTRONIC") {
    const notice = await sendElectronicDenialNotice(
      {
        id,
        referenceNumber: auth.request.referenceNumber,
        requestType: auth.request.requestType,
        homeownerName: auth.request.homeownerName,
        homeownerEmail: auth.request.homeownerEmail,
        propertyAddress: auth.request.propertyAddress,
        hoa: { name: auth.request.hoa.name, logoUrl: auth.request.hoa.logoUrl },
      },
      {
        denialReasons,
        denialRequiredChanges,
        denialNoticeDate,
        deliveryMethod,
        appealRequestWindowAt,
      }
    );
    warning = notice.warning;
  }

  refresh(slug, id);
  return warning ? { ok: true, warning } : { ok: true };
}

export async function requestAppeal(
  slug: string,
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(slug, id);
  if ("error" in auth) return { error: auth.error };
  if (auth.request.status !== "DENIED")
    return { error: "An appeal can only be recorded on a denied request." };

  const dateRaw = String(formData.get("appealRequestedAt") || "").trim();
  const appealRequestedAt = dateRaw ? new Date(dateRaw) : new Date();
  if (Number.isNaN(appealRequestedAt.getTime()))
    return { error: "Invalid request date." };

  const hearingDeadlineAt = computeHearingDeadline(appealRequestedAt);

  await prisma.request.update({
    where: { id },
    data: { status: "APPEAL_REQUESTED", appealRequestedAt, hearingDeadlineAt },
  });
  await logActivity(
    id,
    "APPEAL_REQUESTED",
    `Homeowner requested a hearing on ${formatDate(appealRequestedAt)}. Board must hold the hearing by ${formatDate(hearingDeadlineAt)} (§209.00505).`,
    { actor: "committee" }
  );
  refresh(slug, id);
  return { ok: true };
}

export async function scheduleHearing(
  slug: string,
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(slug, id);
  if ("error" in auth) return { error: auth.error };
  if (auth.request.status !== "APPEAL_REQUESTED")
    return { error: "No pending appeal to schedule." };

  const dateRaw = String(formData.get("hearingScheduledAt") || "").trim();
  if (!dateRaw) return { error: "Enter the hearing date and time." };
  const hearingScheduledAt = new Date(dateRaw);
  if (Number.isNaN(hearingScheduledAt.getTime()))
    return { error: "Invalid hearing date." };

  const warnLate =
    auth.request.hearingDeadlineAt &&
    hearingScheduledAt > auth.request.hearingDeadlineAt;

  await prisma.request.update({
    where: { id },
    data: { status: "HEARING_SCHEDULED", hearingScheduledAt },
  });
  await logActivity(
    id,
    "HEARING_SCHEDULED",
    `Hearing scheduled for ${formatDateTime(hearingScheduledAt)}.${
      warnLate ? " ⚠️ This is AFTER the 30-day statutory deadline." : ""
    }`,
    { actor: "committee" }
  );
  refresh(slug, id);
  return { ok: true };
}

export async function resolveAppeal(
  slug: string,
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(slug, id);
  if ("error" in auth) return { error: auth.error };
  if (auth.request.status !== "HEARING_SCHEDULED")
    return { error: "Only a scheduled hearing can be resolved." };

  const resolution = String(formData.get("appealResolution") || "").trim();
  if (!resolution) return { error: "Enter the outcome of the hearing." };

  await prisma.request.update({
    where: { id },
    data: {
      status: "APPEAL_RESOLVED",
      appealResolvedAt: new Date(),
      appealResolution: resolution,
    },
  });
  await logActivity(id, "APPEAL_RESOLVED", `Appeal resolved: ${resolution}`, {
    actor: "committee",
  });
  refresh(slug, id);
  return { ok: true };
}

export async function addNote(
  slug: string,
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(slug, id);
  if ("error" in auth) return { error: auth.error };
  const note = String(formData.get("note") || "").trim();
  if (!note) return { error: "Note cannot be empty." };
  await logActivity(id, "NOTE", note, { actor: "committee" });
  refresh(slug, id);
  return { ok: true };
}
