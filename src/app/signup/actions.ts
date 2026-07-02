"use server";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { slugify, validateSlug } from "@/lib/slug";
import { sendEmail } from "@/lib/email";
import { verificationEmail } from "@/lib/email-templates";
import { getBaseUrl } from "@/lib/url";
import { addDays } from "@/lib/deadlines";

const TRIAL_DAYS = 30;
const MAX_ACCOUNTS_PER_EMAIL = 3;
const MIN_PASSWORD = 10;

export interface SignupState {
  error?: string;
  success?: { slug: string; email: string };
}

/** Suggest the first available "slug-N" variant when a slug is taken. */
async function suggestVariant(base: string): Promise<string> {
  for (let n = 2; n <= 9; n++) {
    const candidate = `${base}-${n}`.slice(0, 40);
    const exists = await prisma.hoa.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `${base}-${randomBytes(2).toString("hex")}`;
}

export async function signup(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  // Honeypot — real users never fill this hidden field.
  if (String(formData.get("company") || "").trim() !== "") {
    // Silently pretend success so bots get no signal.
    return { success: { slug: "", email: "" } };
  }

  const name = String(formData.get("name") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!name) return { error: "Please enter your association's name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { error: "Please enter a valid email address." };
  if (password.length < MIN_PASSWORD)
    return {
      error: `Password must be at least ${MIN_PASSWORD} characters.`,
    };
  if (password !== confirmPassword)
    return { error: "Passwords do not match." };

  const slug = slugify(slugInput || name);
  const check = validateSlug(slug);
  if (!check.ok) return { error: check.error };

  // Anti-abuse: cap accounts per account email.
  const existingForEmail = await prisma.hoa.count({
    where: { accountEmail: { equals: email, mode: "insensitive" } },
  });
  if (existingForEmail >= MAX_ACCOUNTS_PER_EMAIL)
    return {
      error:
        "This email has reached the maximum number of trial accounts. Please contact us if you need more.",
    };

  // Slug uniqueness with a friendly suggestion.
  const slugTaken = await prisma.hoa.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (slugTaken) {
    const suggestion = await suggestVariant(slug);
    return {
      error: `The web address "${slug}" is already taken. Try "${suggestion}" instead.`,
    };
  }

  const committeePasswordHash = await hashPassword(password);
  const verificationToken = randomBytes(32).toString("hex");
  const trialEndsAt = addDays(new Date(), TRIAL_DAYS);

  try {
    await prisma.hoa.create({
      data: {
        slug,
        name,
        accountEmail: email,
        committeeEmails: [email],
        committeePasswordHash,
        emailVerified: false,
        verificationToken,
        plan: "TRIAL",
        trialEndsAt,
      },
    });
  } catch {
    // Rare race on unique slug/token between check and create.
    return {
      error: "Something went wrong creating your account. Please try again.",
    };
  }

  const baseUrl = await getBaseUrl();
  const verifyUrl = `${baseUrl}/verify?token=${verificationToken}`;
  const email_ = verificationEmail({ hoaName: name, verifyUrl, trialEndsAt });
  await sendEmail({ to: email, ...email_ });

  return { success: { slug, email } };
}
