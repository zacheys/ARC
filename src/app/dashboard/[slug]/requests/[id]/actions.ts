"use server";

import { revalidatePath } from "next/cache";
import type { DeliveryMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import {
  computeAppealWindow,
  computeHearingDeadline,
  formatDate,
} from "@/lib/deadlines";
import { STATUS_LABELS, DELIVERY_METHOD_LABELS } from "@/lib/labels";
import { sendEmail } from "@/lib/email";

export interface ActionState {
  error?: string;
  ok?: boolean;
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

  refresh(slug, id);
  return { ok: true };
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
    `Hearing scheduled for ${hearingScheduledAt.toLocaleString("en-US")}.${
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
