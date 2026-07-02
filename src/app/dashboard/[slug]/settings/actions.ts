"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { uploadFile, isBlobConfigured } from "@/lib/blob";

export interface SettingsState {
  error?: string;
  ok?: string;
}

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
}

export async function updateSettings(
  slug: string,
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await getSession(slug);
  if (!session) return { error: "Not authenticated." };

  const name = String(formData.get("name") || "").trim();
  const emailsRaw = String(formData.get("committeeEmails") || "");
  const reviewDeadlineDays = parseInt(
    String(formData.get("reviewDeadlineDays") || ""),
    10
  );

  if (!name) return { error: "Association name is required." };
  if (!Number.isFinite(reviewDeadlineDays) || reviewDeadlineDays < 1 || reviewDeadlineDays > 365)
    return { error: "Review deadline must be between 1 and 365 days." };

  const committeeEmails = parseEmails(emailsRaw);

  // Optional logo upload
  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!isBlobConfigured())
      return {
        error:
          "Logo upload requires BLOB_READ_WRITE_TOKEN. Other settings were not saved — remove the logo or configure Blob storage.",
      };
    if (!logo.type.startsWith("image/"))
      return { error: "Logo must be an image file." };
    try {
      const uploaded = await uploadFile(logo, `logos/${session.hoaId}`);
      logoUrl = uploaded.url;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Logo upload failed." };
    }
  }

  await prisma.hoa.update({
    where: { id: session.hoaId },
    data: {
      name,
      committeeEmails,
      reviewDeadlineDays,
      ...(logoUrl ? { logoUrl } : {}),
    },
  });

  revalidatePath(`/dashboard/${slug}/settings`);
  revalidatePath(`/dashboard/${slug}`);
  return { ok: "Settings saved." };
}

export async function changePassword(
  slug: string,
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await getSession(slug);
  if (!session) return { error: "Not authenticated." };

  const next = String(formData.get("newPassword") || "");
  const confirm = String(formData.get("confirmPassword") || "");
  if (next.length < 8)
    return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "Passwords do not match." };

  const committeePasswordHash = await hashPassword(next);
  await prisma.hoa.update({
    where: { id: session.hoaId },
    data: { committeePasswordHash },
  });
  return { ok: "Password updated." };
}
