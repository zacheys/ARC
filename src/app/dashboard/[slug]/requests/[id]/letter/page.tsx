import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveHoa } from "@/lib/auth";
import { buildDenialLetter } from "@/lib/letter";
import PrintBar from "./PrintBar";

export const dynamic = "force-dynamic";

export default async function LetterPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  await requireActiveHoa(slug);

  const request = await prisma.request.findFirst({
    where: { id, hoa: { slug } },
    include: { hoa: true },
  });
  if (!request) notFound();
  if (!request.denialReasons) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-ink-soft">
          This request has no denial on record, so no letter can be generated.
        </p>
        <Link
          href={`/dashboard/${slug}/requests/${id}`}
          className="btn-secondary mt-4"
        >
          Back to request
        </Link>
      </div>
    );
  }

  const letter = buildDenialLetter(request, request.hoa);
  const pdfHref = `/dashboard/${slug}/requests/${id}/letter/pdf`;

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4 print:px-0">
        <div className="print:hidden">
          <Link
            href={`/dashboard/${slug}/requests/${id}`}
            className="text-sm text-ink-muted hover:text-ink-soft"
          >
            ← Back to request
          </Link>
        </div>

        <div className="mt-4">
          <PrintBar pdfHref={pdfHref} />
        </div>

        {/* Letter sheet */}
        <article className="mx-auto bg-white p-10 shadow-sm print:p-0 print:shadow-none">
          <header className="mb-8 flex items-center gap-3 border-b-2 border-brand-700 pb-4">
            {letter.logoUrl ? (
              <Image
                src={letter.logoUrl}
                alt={`${letter.hoaName} logo`}
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
            ) : null}
            <div>
              <div className="text-lg font-bold text-brand-700">
                {letter.hoaName}
              </div>
              <div className="text-xs text-ink-muted">
                Architectural Review Committee
              </div>
            </div>
          </header>

          <p className="text-sm">{letter.letterDate}</p>

          <div className="mt-6 text-sm">
            <p className="font-semibold">{letter.ownerName}</p>
            <p>{letter.propertyAddress}</p>
          </div>

          <p className="mt-6 text-sm">
            <span className="font-semibold">Re:</span> Architectural Request{" "}
            {letter.referenceNumber} ({letter.requestTypeLabel})
          </p>

          <p className="mt-6 text-sm">Dear {letter.ownerName},</p>

          <p className="mt-4 text-sm leading-relaxed">
            The Architectural Review Committee has reviewed your architectural
            modification request for the property at {letter.propertyAddress}.
            After careful consideration, the Committee has{" "}
            <span className="font-semibold">denied</span> the request for the
            reasons stated below.
          </p>

          <h2 className="mt-6 text-sm font-bold">
            Specific reasons for denial
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
            {letter.reasons}
          </p>

          <h2 className="mt-5 text-sm font-bold">
            Changes that would result in approval
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
            {letter.requiredChanges}
          </p>

          <div className="my-6 border-l-4 border-brand-700 bg-surface p-4">
            <p className="text-sm font-bold">Your right to a hearing</p>
            <p className="mt-1 text-sm leading-relaxed">
              {letter.rightsParagraph}
            </p>
          </div>

          <p className="text-sm leading-relaxed">{letter.closingParagraph}</p>

          <div className="mt-10 text-sm">
            <p>Sincerely,</p>
            <p className="mt-6 font-semibold">
              Architectural Review Committee
            </p>
            <p>{letter.hoaName}</p>
          </div>

          <footer className="mt-10 border-t border-gray-200 pt-4 text-[11px] leading-relaxed text-ink-muted">
            This notice is provided under Texas Property Code §209.00505. This
            document assists with deadline tracking and does not constitute
            legal advice. Consult your association&rsquo;s attorney and governing
            documents.
            {letter.deliveryMethodLabel
              ? ` Delivery method: ${letter.deliveryMethodLabel}.`
              : ""}
          </footer>
        </article>
      </div>
    </div>
  );
}
