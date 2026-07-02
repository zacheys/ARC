import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildDenialLetter } from "@/lib/letter";
import { DenialLetterDocument } from "@/lib/DenialLetterPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;

  const session = await getSession(slug);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const request = await prisma.request.findFirst({
    where: { id, hoaId: session.hoaId },
    include: { hoa: true },
  });
  if (!request) return new Response("Not found", { status: 404 });
  if (!request.denialReasons)
    return new Response("This request has no denial on record.", {
      status: 400,
    });

  const letter = buildDenialLetter(request, request.hoa);
  const element = React.createElement(DenialLetterDocument, {
    letter,
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(element);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="denial-${request.referenceNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
