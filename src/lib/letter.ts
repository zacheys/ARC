import type { Hoa, Request } from "@prisma/client";
import { formatDate, computeAppealWindow, APPEAL_WINDOW_DAYS } from "./deadlines";
import { DELIVERY_METHOD_LABELS } from "./labels";
import { REQUEST_TYPE_LABELS } from "./labels";

export interface DenialLetter {
  hoaName: string;
  logoUrl: string | null;
  letterDate: string;
  ownerName: string;
  propertyAddress: string;
  referenceNumber: string;
  requestTypeLabel: string;
  reasons: string;
  requiredChanges: string;
  appealDeadlineText: string;
  deliveryMethodLabel: string | null;
  rightsParagraph: string;
  closingParagraph: string;
}

/**
 * Build the content of a §209.00505-compliant denial letter.
 * Shared by the on-screen HTML view and the PDF renderer.
 */
export function buildDenialLetter(
  request: Pick<
    Request,
    | "homeownerName"
    | "propertyAddress"
    | "referenceNumber"
    | "requestType"
    | "denialReasons"
    | "denialRequiredChanges"
    | "denialNoticeDate"
    | "denialDeliveryMethod"
    | "appealRequestWindowAt"
  >,
  hoa: Pick<Hoa, "name" | "logoUrl">
): DenialLetter {
  const noticeDate = request.denialNoticeDate ?? new Date();
  const appealDeadline =
    request.appealRequestWindowAt ?? computeAppealWindow(noticeDate);

  const rightsParagraph =
    `Under Section 209.00505 of the Texas Property Code, you have the right to ` +
    `request a hearing before the Board of Directors regarding this decision. ` +
    `To exercise this right, you must submit a written request for a hearing to ` +
    `the Association within ${APPEAL_WINDOW_DAYS} days after the date of this ` +
    `notice — that is, on or before ${formatDate(appealDeadline)}. If you ` +
    `timely request a hearing, the Board will hold the hearing within 30 days ` +
    `after the Association receives your request.`;

  const closingParagraph =
    `This notice is provided to satisfy the Association's obligations under the ` +
    `Texas Property Code and the Association's governing documents. If you have ` +
    `questions, please contact the Architectural Review Committee.`;

  return {
    hoaName: hoa.name,
    logoUrl: hoa.logoUrl,
    letterDate: formatDate(noticeDate),
    ownerName: request.homeownerName,
    propertyAddress: request.propertyAddress,
    referenceNumber: request.referenceNumber,
    requestTypeLabel: REQUEST_TYPE_LABELS[request.requestType],
    reasons: request.denialReasons ?? "",
    requiredChanges: request.denialRequiredChanges ?? "",
    appealDeadlineText: formatDate(appealDeadline),
    deliveryMethodLabel: request.denialDeliveryMethod
      ? DELIVERY_METHOD_LABELS[request.denialDeliveryMethod]
      : null,
    rightsParagraph,
    closingParagraph,
  };
}
