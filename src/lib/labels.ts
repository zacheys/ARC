import type {
  RequestStatus,
  RequestType,
  DeliveryMethod,
} from "@prisma/client";

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  FENCE: "Fence",
  PAINT: "Paint / Exterior Color",
  ROOF: "Roof",
  ADDITION: "Addition / Structure",
  LANDSCAPING: "Landscaping",
  SOLAR: "Solar",
  OTHER: "Other",
};

export const REQUEST_TYPE_OPTIONS = Object.entries(REQUEST_TYPE_LABELS) as [
  RequestType,
  string
][];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  DENIED: "Denied",
  APPEAL_REQUESTED: "Appeal Requested",
  HEARING_SCHEDULED: "Hearing Scheduled",
  APPEAL_RESOLVED: "Appeal Resolved",
};

export const STATUS_BADGE_CLASSES: Record<RequestStatus, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  DENIED: "bg-red-100 text-red-800",
  APPEAL_REQUESTED: "bg-amber-100 text-amber-800",
  HEARING_SCHEDULED: "bg-indigo-100 text-indigo-800",
  APPEAL_RESOLVED: "bg-slate-200 text-slate-700",
};

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  CERTIFIED_MAIL: "Certified Mail",
  HAND_DELIVERY: "Hand Delivery",
  ELECTRONIC: "Electronic Delivery",
};

export const DELIVERY_METHOD_OPTIONS = Object.entries(
  DELIVERY_METHOD_LABELS
) as [DeliveryMethod, string][];

/** Terminal statuses that are considered "closed" for the archive. */
export const CLOSED_STATUSES: RequestStatus[] = ["APPROVED", "APPEAL_RESOLVED"];

/**
 * Allowed forward transitions for the committee workflow.
 * PENDING → UNDER_REVIEW → APPROVED | DENIED
 * DENIED → APPEAL_REQUESTED → HEARING_SCHEDULED → APPEAL_RESOLVED
 */
export const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  PENDING: ["UNDER_REVIEW", "APPROVED", "DENIED"],
  UNDER_REVIEW: ["APPROVED", "DENIED"],
  APPROVED: [],
  DENIED: ["APPEAL_REQUESTED"],
  APPEAL_REQUESTED: ["HEARING_SCHEDULED"],
  HEARING_SCHEDULED: ["APPEAL_RESOLVED"],
  APPEAL_RESOLVED: [],
};
