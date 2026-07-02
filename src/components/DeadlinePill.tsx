import {
  daysRemainingLabel,
  formatDate,
  URGENCY_CLASSES,
  URGENCY_DOT,
  type ActiveDeadline,
} from "@/lib/deadlines";

export function UrgencyDot({
  urgency,
}: {
  urgency: ActiveDeadline["urgency"] | "none";
}) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${URGENCY_DOT[urgency]}`}
      aria-hidden
    />
  );
}

export default function DeadlinePill({
  deadline,
}: {
  deadline: ActiveDeadline | null;
}) {
  if (!deadline) {
    return (
      <span className="badge border border-gray-200 bg-gray-100 text-gray-500">
        No active deadline
      </span>
    );
  }
  return (
    <span
      className={`badge gap-1.5 border ${URGENCY_CLASSES[deadline.urgency]}`}
      title={`${deadline.label} — ${formatDate(deadline.date)} (${deadline.statute})`}
    >
      <UrgencyDot urgency={deadline.urgency} />
      {daysRemainingLabel(deadline.daysRemaining)}
    </span>
  );
}
