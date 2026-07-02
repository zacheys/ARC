import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import Footer from "@/components/Footer";
import Brand from "@/components/Brand";
import { logout } from "../login/actions";
import { BILLING_CONTACT_EMAIL, isDashboardBlocked } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function TrialEndedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireSession(slug);

  const hoa = await prisma.hoa.findUnique({ where: { slug } });
  if (!hoa) notFound();

  // If the account is active again, don't strand them here.
  if (!isDashboardBlocked(hoa)) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md text-center">
            <p className="text-sm text-ink-soft">Your account is active.</p>
            <Link href={`/dashboard/${slug}`} className="btn-primary mt-4">
              Go to dashboard
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const logoutAction = logout.bind(null, slug);
  const mailto = `mailto:${BILLING_CONTACT_EMAIL}?subject=${encodeURIComponent(
    `ARCTrack subscription — ${hoa.name} (${slug})`
  )}`;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <Brand className="mx-auto h-9 w-auto" href={null} />
          <div className="card mt-6 p-8">
            <h1 className="text-xl font-semibold text-ink">
              Your free trial has ended
            </h1>
            <p className="mt-3 text-sm text-ink-soft">
              The trial for <strong>{hoa.name}</strong> has ended, so the
              committee dashboard is paused. Your records are safe and nothing
              has been deleted. Get in touch to continue your subscription and
              restore access.
            </p>
            <a href={mailto} className="btn-primary mt-6 w-full">
              Contact us to continue
            </a>
            <p className="mt-4 text-xs text-ink-muted">
              Homeowners can still submit requests and check status &mdash; only
              the committee dashboard is affected.
            </p>
            <form action={logoutAction} className="mt-4">
              <button className="text-sm text-ink-soft hover:text-ink hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
