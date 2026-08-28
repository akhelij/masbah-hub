import { z } from "zod";
import { handleError, HttpError, ok, requireApiKey } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { runAutomations } from "@/lib/automations";
import { createLead, updateLead } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { createLeadSchema, channelEnum, leadStatusEnum } from "@/lib/validators";

type Ctx = { params: Promise<{ event: string }> };

const SUPPORTED = ["new-lead", "lead-status-change", "message-received"] as const;

const statusChangeSchema = z.object({
  leadId: z.string().optional(),
  phone: z.string().optional(),
  status: leadStatusEnum,
  note: z.string().optional(),
});

const inboundMessageSchema = z.object({
  leadId: z.string().optional(),
  phone: z.string().optional(),
  channel: channelEnum.default("WHATSAPP"),
  content: z.string().min(1),
  createLeadIfMissing: z.boolean().default(false),
  name: z.string().optional(),
  city: z.string().optional(),
});

async function findLead(leadId?: string, phone?: string) {
  if (leadId) return prisma.lead.findUnique({ where: { id: leadId } });
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "").slice(-9);
  return prisma.lead.findFirst({
    where: { OR: [{ phone: { contains: digits } }, { whatsapp: { contains: digits } }] },
  });
}

/**
 * n8n-compatible inbound webhooks. Auth: `x-api-key` header.
 *   POST /api/webhooks/new-lead
 *   POST /api/webhooks/lead-status-change
 *   POST /api/webhooks/message-received
 */
export async function POST(request: Request, { params }: Ctx) {
  const { event } = await params;
  let payload: unknown = null;

  try {
    await requireApiKey(request);
    if (!SUPPORTED.includes(event as (typeof SUPPORTED)[number])) {
      throw new HttpError(404, `Unknown webhook event "${event}". Supported: ${SUPPORTED.join(", ")}`);
    }
    payload = await request.json();

    if (event === "new-lead") {
      const lead = await createLead(createLeadSchema.parse(payload));
      await prisma.webhookLog.create({
        data: { event, direction: "INBOUND", payload: payload as never, statusCode: 201, success: true },
      });
      return ok({ received: true, leadId: lead.id }, 201);
    }

    if (event === "lead-status-change") {
      const input = statusChangeSchema.parse(payload);
      const found = await findLead(input.leadId, input.phone);
      if (!found) throw new HttpError(404, "Lead not found");
      const lead = await updateLead(found.id, { status: input.status });
      if (input.note) {
        await logActivity({ leadId: found.id, type: "NOTE", title: "Note via webhook", detail: input.note });
      }
      await prisma.webhookLog.create({
        data: { event, direction: "INBOUND", payload: payload as never, statusCode: 200, success: true },
      });
      return ok({ received: true, leadId: lead?.id });
    }

    // message-received
    const input = inboundMessageSchema.parse(payload);
    let lead = await findLead(input.leadId, input.phone);

    if (!lead && input.createLeadIfMissing && input.phone) {
      lead = await createLead(
        createLeadSchema.parse({
          name: input.name ?? `Prospect ${input.phone}`,
          city: input.city ?? "Inconnue",
          phone: input.phone,
          whatsapp: input.phone,
          source: "WHATSAPP",
          status: "RESPONDED",
        }),
      );
    }
    if (!lead) throw new HttpError(404, "Lead not found");

    const now = new Date();
    await prisma.message.create({
      data: {
        leadId: lead.id,
        channel: input.channel,
        direction: "INBOUND",
        content: input.content,
        createdAt: now,
      },
    });
    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        lastContactAt: now,
        ...(["NEW", "CONTACTED"].includes(lead.status) ? { status: "RESPONDED" as const } : {}),
      },
    });
    await logActivity({
      leadId: lead.id,
      type: "MESSAGE_RECEIVED",
      title: `Réponse reçue (${input.channel}) via webhook`,
      detail: input.content.slice(0, 240),
    });
    void runAutomations({ trigger: "MESSAGE_RECEIVED", lead: updated });

    await prisma.webhookLog.create({
      data: { event, direction: "INBOUND", payload: payload as never, statusCode: 200, success: true },
    });
    return ok({ received: true, leadId: lead.id });
  } catch (err) {
    await prisma.webhookLog
      .create({
        data: {
          event,
          direction: "INBOUND",
          payload: (payload ?? {}) as never,
          statusCode: err instanceof HttpError ? err.status : 500,
          response: err instanceof Error ? err.message : "unknown",
          success: false,
        },
      })
      .catch(() => {});
    return handleError(err);
  }
}

export async function GET() {
  return ok({
    events: SUPPORTED.map((e) => `POST /api/webhooks/${e}`),
    auth: "Header: x-api-key",
  });
}
