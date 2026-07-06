import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Footer from "@/components/Footer";
import Brand from "@/components/Brand";
import FinderSearch from "./FinderSearch";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Find your association — ARCTrack",
};

export default async function SubmitFinderPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  // Only search when there's a query — never list every association at once.
  const matches = query
    ? await prisma.hoa.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        select: { slug: true, name: true },
        orderBy: { name: "asc" },
        take: 10,
      })
    : [];

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <Brand className="h-9 w-auto" />
            <h1 className="mt-4 text-xl font-semibold text-ink">
              Find your association
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Search for your homeowners association to submit an architectural
              request.
            </p>
          </div>

          <FinderSearch initialQuery={query} />

          <div className="mt-6">
            {!query ? (
              <p className="text-center text-sm text-ink-muted">
                Enter your association&rsquo;s name above to get started.
              </p>
            ) : matches.length === 0 ? (
              <p className="text-center text-sm text-ink-soft">
                We couldn&rsquo;t find that association. Check the spelling, or
                ask your committee for your direct submission link.
              </p>
            ) : (
              <ul className="space-y-2">
                {matches.map((hoa) => (
                  <li key={hoa.slug}>
                    <Link
                      href={`/submit/${hoa.slug}`}
                      className="card flex items-center justify-between p-4 transition hover:border-brand-600 hover:bg-surface"
                    >
                      <span className="font-medium text-ink">{hoa.name}</span>
                      <span aria-hidden className="text-brand-700">
                        &rarr;
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-8 text-center text-sm text-ink-muted">
            Already submitted?{" "}
            <Link href="/status" className="text-brand-700 hover:underline">
              Check your request status
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
