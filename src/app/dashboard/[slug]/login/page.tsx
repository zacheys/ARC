import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Footer from "@/components/Footer";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const { from } = await searchParams;
  const hoa = await prisma.hoa.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!hoa) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="text-lg font-bold text-brand-700">ARCTrack</div>
            <h1 className="mt-4 text-xl font-semibold text-ink">
              {hoa.name}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Committee dashboard sign-in
            </p>
          </div>
          <div className="card p-6">
            <LoginForm slug={slug} from={from} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
