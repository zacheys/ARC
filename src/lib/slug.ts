// Slug helpers shared by signup (client auto-suggest + server validation)
// and the /signin redirect.

export const RESERVED_SLUGS = [
  "dashboard",
  "submit",
  "status",
  "signin",
  "signup",
  "api",
  "admin",
  "settings",
  "login",
  "verify",
];

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

/** Normalize free-form text to a candidate slug: lowercase, hyphens, alnum. */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SLUG_MAX);
}

export interface SlugCheck {
  ok: boolean;
  error?: string;
}

/** Validate a final slug against format + reserved-word rules. */
export function validateSlug(slug: string): SlugCheck {
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX)
    return {
      ok: false,
      error: `The web address must be between ${SLUG_MIN} and ${SLUG_MAX} characters.`,
    };
  if (!/^[a-z0-9-]+$/.test(slug))
    return {
      ok: false,
      error:
        "The web address may only contain lowercase letters, numbers, and hyphens.",
    };
  if (/^-|-$|--/.test(slug))
    return {
      ok: false,
      error: "The web address can't start or end with a hyphen or contain '--'.",
    };
  if (RESERVED_SLUGS.includes(slug))
    return { ok: false, error: `"${slug}" is reserved. Please choose another.` };
  return { ok: true };
}
