import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const hoas = await prisma.hoa.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, _count: { select: { requests: true } } },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-brand-700">ARCTrack</span>
            <span className="text-sm text-ink-muted">ARC Request Tracking</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Architectural review, tracked against the clock
          </h1>
          <p className="mt-4 text-ink-soft">
            ARCTrack keeps every architectural request on schedule against the
            procedural deadlines of{" "}
            <span className="font-medium">
              Texas Property Code &sect;209.00505
            </span>{" "}
            &mdash; written denial notices, the homeowner&rsquo;s 30-day appeal
            window, and the board&rsquo;s 30-day hearing deadline &mdash; so a
            missed step never costs your association its ability to enforce a
            decision.
          </p>
        </div>

        <div className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Associations
          </h2>
          {hoas.length === 0 ? (
            <div className="card mt-4 p-6 text-sm text-ink-soft">
              No associations yet. Run{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5">
                npm run db:seed
              </code>{" "}
              to load sample data.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hoas.map((hoa) => (
                <div key={hoa.id} className="card flex flex-col p-5">
                  <h3 className="font-semibold text-ink">{hoa.name}</h3>
                  <p className="mt-1 text-xs text-ink-muted">
                    {hoa._count.requests} request
                    {hoa._count.requests === 1 ? "" : "s"} on file
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/submit/${hoa.slug}`}
                      className="btn-primary flex-1"
                    >
                      Submit a request
                    </Link>
                    <Link
                      href={`/dashboard/${hoa.slug}`}
                      className="btn-secondary"
                    >
                      Committee
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
