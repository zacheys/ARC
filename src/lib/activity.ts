import type { Prisma, PrismaClient, ActivityType } from "@prisma/client";
import { prisma } from "./prisma";

type Db = PrismaClient | Prisma.TransactionClient;

/** Append an entry to a request's activity log (audit trail). */
export async function logActivity(
  requestId: string,
  type: ActivityType,
  message: string,
  opts: { actor?: string; metadata?: Prisma.InputJsonValue; db?: Db } = {}
) {
  const db = opts.db ?? prisma;
  return db.activity.create({
    data: {
      requestId,
      type,
      message,
      actor: opts.actor ?? "system",
      metadata: opts.metadata,
    },
  });
}
