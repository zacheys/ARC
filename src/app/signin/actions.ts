"use server";

import { redirect } from "next/navigation";

export interface SigninState {
  error?: string;
}

/** Normalize free-form input ("Oak Ridge", " oak-ridge ") to a URL slug. */
function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function goToDashboard(
  _prev: SigninState,
  formData: FormData
): Promise<SigninState> {
  const slug = toSlug(String(formData.get("slug") || ""));
  if (!slug)
    return { error: "Please enter your association's web address name." };
  redirect(`/dashboard/${slug}/login`);
}
