import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { formatDate } from "@/lib/deadlines";
import { REQUEST_TYPE_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { slug } = await params;
  const { ref } = await searchParams;
  if (!ref) notFound();

  const request = await prisma.request.findFirst({
    where: { referenceNumber: ref, hoa: { slug } },
    include: { hoa: { select: { name: true, logoUrl: true } } },
  });
  if (!request) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader hoaName={request.hoa.name} logoUrl={request.hoa.logoUrl} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <div className="card p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-7 w-7 text-green-700"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          </div>
          <h1 className="mt-5 text-2xl font-bold text-ink">
            Request received
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Thank you. Your request has been submitted to the {request.hoa.name}{" "}
            Architectural Review Committee and a confirmation email is on its
            way.
          </p>

          <div className="mt-6 rounded-lg bg-surface p-4">
            <div className="text-xs uppercase tracking-wide text-ink-muted">
              Reference number
            </div>
            <div className="mt-1 text-xl font-bold tracking-tight text-brand-700">
              {request.referenceNumber}
            </div>
          </div>

          <dl className="mt-6 divide-y divide-gray-100 text-left text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-ink-muted">Request type</dt>
              <dd className="font-medium">
                {REQUEST_TYPE_LABELS[request.requestType]}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-ink-muted">Property</dt>
              <dd className="font-medium">{request.propertyAddress}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-ink-muted">Submitted</dt>
              <dd className="font-medium">{formatDate(request.submittedAt)}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-ink-muted">Target decision date</dt>
              <dd className="font-medium">
                {formatDate(request.reviewDeadlineAt)}
              </dd>
            </div>
          </dl>

          <div className="mt-8">
            <Link href={`/submit/${slug}`} className="btn-secondary">
              Submit another request
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
