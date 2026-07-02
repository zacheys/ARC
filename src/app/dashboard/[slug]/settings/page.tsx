import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";
import { isBlobConfigured } from "@/lib/blob";
import { SettingsForm, PasswordForm } from "./SettingsForms";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireSession(slug);

  const hoa = await prisma.hoa.findUnique({ where: { slug } });
  if (!hoa) notFound();

  return (
    <DashboardShell slug={slug} hoaName={hoa.name} active="settings">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink">Settings</h1>
        <p className="text-sm text-ink-muted">
          Association configuration for <code>{hoa.slug}</code>. Public form:{" "}
          <code>/submit/{hoa.slug}</code>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Association
            </h2>
            <SettingsForm
              slug={slug}
              name={hoa.name}
              committeeEmails={hoa.committeeEmails}
              reviewDeadlineDays={hoa.reviewDeadlineDays}
              logoUrl={hoa.logoUrl}
              blobConfigured={isBlobConfigured()}
            />
          </section>
        </div>

        <div>
          <section className="card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Committee password
            </h2>
            <PasswordForm slug={slug} />
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
