import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import SubmitForm from "./SubmitForm";

export const dynamic = "force-dynamic";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hoa = await prisma.hoa.findUnique({
    where: { slug },
    select: { name: true, logoUrl: true },
  });
  if (!hoa) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader hoaName={hoa.name} logoUrl={hoa.logoUrl} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-ink">
          Architectural Request Form
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Submit your architectural modification request to the{" "}
          {hoa.name} Architectural Review Committee. Required fields are marked
          with <span className="text-red-600">*</span>.
        </p>

        <div className="card mt-8 p-6 sm:p-8">
          <SubmitForm slug={slug} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
