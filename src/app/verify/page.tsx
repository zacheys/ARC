import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verify your email — ARCTrack",
};

async function consumeToken(
  token: string | undefined
): Promise<{ ok: true; slug: string; name: string } | { ok: false }> {
  if (!token) return { ok: false };
  const hoa = await prisma.hoa.findUnique({
    where: { verificationToken: token },
    select: { id: true, slug: true, name: true },
  });
  if (!hoa) return { ok: false };
  await prisma.hoa.update({
    where: { id: hoa.id },
    data: { emailVerified: true, verificationToken: null },
  });
  return { ok: true, slug: hoa.slug, name: hoa.name };
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = await consumeToken(token);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <Link href="/" className="text-lg font-bold text-brand-700">
            ARCTrack
          </Link>

          {result.ok ? (
            <div className="card mt-6 p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-700"
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
              <h1 className="mt-4 text-xl font-semibold text-ink">
                Email verified
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                Your account for <strong>{result.name}</strong> is active and
                your 30-day free trial has started.
              </p>
              <Link
                href={`/dashboard/${result.slug}/login`}
                className="btn-primary mt-6 w-full"
              >
                Go to your dashboard
              </Link>
            </div>
          ) : (
            <div className="card mt-6 p-6">
              <h1 className="text-xl font-semibold text-ink">
                This link isn&rsquo;t valid
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                This verification link is invalid or has already been used. If
                you&rsquo;ve already verified, you can sign in directly.
              </p>
              <Link href="/signin" className="btn-secondary mt-6 w-full">
                Committee sign in
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
