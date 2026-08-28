import type { Lead, TriggerType } from "@prisma/client";
import { prisma } from "./prisma";
import { logActivity } from "./activity";

type TriggerContext = {
  trigger: TriggerType;
  lead: Lead;
  extra?: Record<string, unknown>;
};

function conditionsMatch(conditions: unknown, lead: Lead, extra?: Record<string, unknown>) {
  if (!conditions || typeof conditions !== "object") return true;
  const c = conditions as Record<string, unknown>;
  if (c.city && String(c.city).toLowerCase() !== lead.city.toLowerCase()) return false;
  if (c.status && c.status !== lead.status) return false;
  if (c.source && c.source !== lead.source) return false;
  if (typeof c.minScore === "number" && lead.score < c.minScore) return false;
  if (c.fromStatus && extra?.fromStatus !== c.fromStatus) return false;
  if (c.toStatus && extra?.toStatus !== c.toStatus) return false;
  return true;
}

async function postWebhook(url: string, payload: unknown, secret?: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(secret ? { "x-masbah-signature": secret } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await res.text().catch(() => "");
    return { statusCode: res.status, success: res.ok, response: text.slice(0, 2000) };
  } catch (err) {
    return {
      statusCode: null as number | null,
      success: false,
      response: err instanceof Error ? err.message : "unknown error",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Evaluates every active automation for a trigger. Never throws — automation
 * failures must not break the request that caused them.
 */
export async function runAutomations(ctx: TriggerContext): Promise<void> {
  try {
    const automations = await prisma.automation.findMany({
      where: { trigger: ctx.trigger, isActive: true },
    });

    for (const automation of automations) {
      if (!conditionsMatch(automation.conditions, ctx.lead, ctx.extra)) continue;
      const config = (automation.actionConfig ?? {}) as Record<string, unknown>;
      const payload = {
        event: ctx.trigger,
        automation: { id: automation.id, name: automation.name },
        lead: ctx.lead,
        extra: ctx.extra ?? {},
        firedAt: new Date().toISOString(),
      };

      switch (automation.action) {
        case "SEND_WEBHOOK": {
          const url = typeof config.url === "string" ? config.url : null;
          if (!url) break;
          const result = await postWebhook(url, payload, typeof config.secret === "string" ? config.secret : undefined);
          await prisma.webhookLog.create({
            data: {
              automationId: automation.id,
              event: ctx.trigger,
              direction: "OUTBOUND",
              endpoint: url,
              payload: payload as never,
              statusCode: result.statusCode,
              response: result.response,
              success: result.success,
            },
          });
          break;
        }
        case "CHANGE_STATUS": {
          const status = config.status as Lead["status"] | undefined;
          if (!status || status === ctx.lead.status) break;
          await prisma.lead.update({ where: { id: ctx.lead.id }, data: { status } });
          await logActivity({
            leadId: ctx.lead.id,
            type: "AUTOMATION",
            title: `Automatisation « ${automation.name} » : statut → ${status}`,
          });
          break;
        }
        case "ADD_TAG": {
          const tag = typeof config.tag === "string" ? config.tag : null;
          if (!tag || ctx.lead.tags.includes(tag)) break;
          await prisma.lead.update({
            where: { id: ctx.lead.id },
            data: { tags: { push: tag } },
          });
          break;
        }
        case "SCHEDULE_FOLLOW_UP": {
          const days = typeof config.days === "number" ? config.days : 3;
          await prisma.lead.update({
            where: { id: ctx.lead.id },
            data: { nextFollowUpAt: new Date(Date.now() + days * 86_400_000) },
          });
          break;
        }
        case "NOTIFY": {
          await logActivity({
            leadId: ctx.lead.id,
            type: "AUTOMATION",
            title: `Automatisation « ${automation.name} »`,
            detail: typeof config.message === "string" ? config.message : null,
          });
          break;
        }
      }

      await prisma.automation.update({
        where: { id: automation.id },
        data: { runCount: { increment: 1 }, lastRunAt: new Date() },
      });
    }
  } catch (err) {
    console.error("[automations] failed:", err);
  }
}
