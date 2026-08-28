import type { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function logActivity(params: {
  leadId: string;
  userId?: string | null;
  type: ActivityType;
  title: string;
  detail?: string | null;
  meta?: Prisma.InputJsonValue;
}) {
  return prisma.activity.create({
    data: {
      leadId: params.leadId,
      userId: params.userId ?? null,
      type: params.type,
      title: params.title,
      detail: params.detail ?? null,
      meta: params.meta,
    },
  });
}
