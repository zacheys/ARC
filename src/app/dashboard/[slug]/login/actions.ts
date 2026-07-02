"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import {
  createSessionToken,
  sessionCookieName,
  SESSION_TTL_MS,
} from "@/lib/session";

export interface LoginState {
  error?: string;
}

export async function login(
  slug: string,
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = String(formData.get("password") || "");
  const from = String(formData.get("from") || "");

  const hoa = await prisma.hoa.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      committeePasswordHash: true,
      emailVerified: true,
    },
  });
  if (!hoa) return { error: "Association not found." };

  const ok = await verifyPassword(password, hoa.committeePasswordHash);
  if (!ok) return { error: "Incorrect password." };

  if (!hoa.emailVerified)
    return {
      error:
        "Please verify your email before signing in. Check your inbox for the verification link.",
    };

  const token = await createSessionToken({ hoaId: hoa.id, slug: hoa.slug });
  const store = await cookies();
  store.set(sessionCookieName(slug), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  const dest =
    from && from.startsWith(`/dashboard/${slug}`)
      ? from
      : `/dashboard/${slug}`;
  redirect(dest);
}

export async function logout(slug: string) {
  const store = await cookies();
  store.delete(sessionCookieName(slug));
  redirect(`/dashboard/${slug}/login`);
}
