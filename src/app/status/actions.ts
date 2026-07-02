"use server";

import type { RequestStatus, RequestType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Safe, public-facing subset of a request. Never includes notes, phone,
 *  attachments, activity, or any sibling requests. */
export interface StatusResult {
  referenceNumber: string;
  requestType: RequestType;
  status: RequestStatus;
  propertyAddress: string;
  submittedAt: Date;
  decisionAt: Date | null;
  reviewDeadlineAt: Date;
  denialNoticeDate: Date | null;
  appealRequestWindowAt: Date | null;
  hearingDeadlineAt: Date | null;
}

export interface StatusState {
  error?: string;
  result?: StatusResult;
}

const GENERIC_ERROR =
  "We couldn't find a request matching that reference number and email.";

export async function lookupStatus(
  _prev: StatusState,
  formData: FormData
): Promise<StatusState> {
  const referenceNumber = String(formData.get("referenceNumber") || "").trim();
  const email = String(formData.get("email") || "").trim();

  if (!referenceNumber) return { error: "Please enter your reference number." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { error: "Please enter a valid email address." };

  // Case-insensitive match on BOTH fields. A single generic error is returned
  // for any miss so we never reveal which field was wrong (no enumeration).
  const request = await prisma.request.findFirst({
    where: {
      referenceNumber: { equals: referenceNumber, mode: "insensitive" },
      homeownerEmail: { equals: email, mode: "insensitive" },
    },
    select: {
      referenceNumber: true,
      requestType: true,
      status: true,
      propertyAddress: true,
      submittedAt: true,
      decisionAt: true,
      reviewDeadlineAt: true,
      denialNoticeDate: true,
      appealRequestWindowAt: true,
      hearingDeadlineAt: true,
    },
  });

  if (!request) return { error: GENERIC_ERROR };

  return { result: request };
}
