import { handleError, HttpError, ok, requireUser } from "@/lib/api";
import { generateOutreachMessage } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { generateMessageSchema } from "@/lib/validators";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await requireUser();
    const input = generateMessageSchema.parse(await request.json());

    const lead = await prisma.lead.findUnique({
      where: { id: input.leadId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 10 } },
    });
    if (!lead) throw new HttpError(404, "Prospect introuvable");

    const content = await generateOutreachMessage({
      leadName: lead.name,
      city: lead.city,
      source: lead.source,
      poolType: lead.poolName ?? lead.tags.join(", ") ?? null,
      tags: lead.tags,
      status: lead.status,
      tone: input.tone,
      language: input.language,
      channel: input.channel,
      previousMessages: lead.messages.map((m) => ({ direction: m.direction, content: m.content })),
      extraInstructions: input.extraInstructions ?? null,
    });

    return ok({
      content,
      prompt: `tone=${input.tone} lang=${input.language} channel=${input.channel}`,
    });
  } catch (err) {
    return handleError(err);
  }
}
