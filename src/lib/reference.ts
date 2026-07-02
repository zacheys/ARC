/**
 * Build a human-friendly reference number from an HOA slug + sequence.
 * Example: slug "oak-ridge", seq 7, year 2026 -> "OAKRIDGE-2026-0007".
 */
export function buildReferenceNumber(
  slug: string,
  seq: number,
  date: Date = new Date()
): string {
  const prefix = slug.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 8);
  const year = date.getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}
