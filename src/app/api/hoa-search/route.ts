import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public association search for the /submit finder's type-ahead.
 * Returns only name + slug. Requires a query of 2+ chars and caps results,
 * so the full customer list is never enumerable in one call.
 */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return Response.json({ results: [] });

  const results = await prisma.hoa.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
    take: 8,
  });

  return Response.json({ results });
}
