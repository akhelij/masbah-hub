import type { NextRequest } from "next/server";
import { handleError, HttpError, ok, requireUser, requireWriteAccess } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { runAutomations } from "@/lib/automations";
import { prisma } from "@/lib/prisma";
import { createMessageSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const sp = request.nextUrl.searchParams;
    const leadId = sp.get("leadId");
    const channel = sp.get("channel");
    const direction = sp.get("direction");
    const take = Math.min(200, Number(sp.get("take") ?? 50));

    const messages = await prisma.message.findMany({
      where: {
        ...(leadId ? { leadId } : {}),
        ...(channel && channel !== "ALL" ? { channel: channel as never } : {}),
        ...(direction && direction !== "ALL" ? { direction: direction as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      include: { lead: { select: { id: true, name: true, city: true, status: true } } },
    });

    return ok({ messages });
  } catch (err) {
    return handleError(err);
  }
}

/** Logs an outbound (or manually recorded inbound) message and advances the lead. */
export async function POST(request: Request) {
  try {
    const user = requireWriteAccess(await requireUser());
    const input = createMessageSchema.parse(await request.json());

    const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) throw new HttpError(404, "Prospect introuvable");

    const now = new Date();
    const message = await prisma.message.create({
      data: {
        leadId: input.leadId,
        channel: input.channel,
        direction: input.direction,
        content: input.content,
        language: input.language,
        templateId: input.templateId ?? null,
        aiGenerated: input.aiGenerated,
        aiPrompt: input.aiPrompt ?? null,
        sentAt: input.direction === "OUTBOUND" && input.markSent ? now : null,
      },
    });

    if (input.templateId) {
      await prisma.template.update({
        where: { id: input.templateId },
        data: { usageCount: { increment: 1 } },
      });
    }

    if (input.direction === "OUTBOUND") {
      const updated = await prisma.lead.update({
        where: { id: input.leadId },
        data: {
          lastContactAt: now,
          firstContactAt: lead.firstContactAt ?? now,
          contactCount: { increment: 1 },
          ...(lead.status === "NEW" ? { status: "CONTACTED" as const } : {}),
        },
      });
      await logActivity({
        leadId: lead.id,
        userId: user.id,
        type: "MESSAGE_SENT",
        title: `Message envoyé (${input.channel})`,
        detail: input.content.slice(0, 240),
      });
      if (lead.status === "NEW") {
        void runAutomations({
          trigger: "LEAD_STATUS_CHANGED",
          lead: updated,
          extra: { fromStatus: "NEW", toStatus: "CONTACTED" },
        });
      }
    } else {
      const updated = await prisma.lead.update({
        where: { id: input.leadId },
        data: { lastContactAt: now },
      });
      await logActivity({
        leadId: lead.id,
        userId: user.id,
        type: "MESSAGE_RECEIVED",
        title: `Réponse reçue (${input.channel})`,
        detail: input.content.slice(0, 240),
      });
      void runAutomations({ trigger: "MESSAGE_RECEIVED", lead: updated });
    }

    return ok(message, 201);
  } catch (err) {
    return handleError(err);
  }
}
