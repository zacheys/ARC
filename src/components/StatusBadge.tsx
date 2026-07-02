import type { RequestStatus } from "@prisma/client";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/labels";

export default function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`badge ${STATUS_BADGE_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
