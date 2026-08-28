import type { Prisma, LeadStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { runAutomations } from "./automations";
import { computeLeadScore } from "./scoring";
import { normalizePhone } from "./utils";
import type { CreateLeadInput, UpdateLeadInput } from "./validators";
import { LEAD_STATUS_ORDER } from "./constants";

export type LeadFilters = {
  q?: string;
  status?: string;
  city?: string;
  source?: string;
  tag?: string;
  assignedToId?: string;
  sort?: string;
  page?: number;
  perPage?: number;
};

export function buildLeadWhere(f: LeadFilters): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
  const and: Prisma.LeadWhereInput[] = [];

  if (f.q) {
    and.push({
      OR: [
        { name: { contains: f.q, mode: "insensitive" } },
        { city: { contains: f.q, mode: "insensitive" } },
        { phone: { contains: f.q } },
        { whatsapp: { contains: f.q } },
        { email: { contains: f.q, mode: "insensitive" } },
        { address: { contains: f.q, mode: "insensitive" } },
        { poolName: { contains: f.q, mode: "insensitive" } },
        { notes: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  if (f.status && f.status !== "ALL") and.push({ status: f.status as LeadStatus });
  if (f.city && f.city !== "ALL") and.push({ city: { equals: f.city, mode: "insensitive" } });
  if (f.source && f.source !== "ALL") and.push({ source: f.source as never });
  if (f.tag) and.push({ tags: { has: f.tag } });
  if (f.assignedToId && f.assignedToId !== "ALL") and.push({ assignedToId: f.assignedToId });

  if (and.length) where.AND = and;
  return where;
}

export function buildLeadOrderBy(sort?: string): Prisma.LeadOrderByWithRelationInput {
  switch (sort) {
    case "oldest": return { createdAt: "asc" };
    case "name": return { name: "asc" };
    case "city": return { city: "asc" };
    case "score": return { score: "desc" };
    case "lastContact": return { lastContactAt: "desc" };
    default: return { createdAt: "desc" };
  }
}

const scoreFields = (data: Record<string, unknown>) => ({
  phone: data.phone as string | null,
  whatsapp: data.whatsapp as string | null,
  email: data.email as string | null,
  website: data.website as string | null,
  city: (data.city as string) ?? "",
  rating: data.rating as number | null,
  address: data.address as string | null,
  tags: (data.tags as string[]) ?? [],
  latitude: data.latitude as number | null,
});

export async function createLead(input: CreateLeadInput, userId?: string | null) {
  const data = {
    ...input,
    phone: normalizePhone(input.phone) ?? input.phone ?? null,
    whatsapp: normalizePhone(input.whatsapp) ?? input.whatsapp ?? null,
  };

  const lead = await prisma.lead.create({
    data: { ...(data as Prisma.LeadCreateInput), score: computeLeadScore(scoreFields(data)) },
  });

  await logActivity({
    leadId: lead.id,
    userId,
    type: "CREATED",
    title: `Prospect créé depuis ${lead.source}`,
  });
  void runAutomations({ trigger: "LEAD_CREATED", lead });

  return lead;
}

export async function updateLead(id: string, input: UpdateLeadInput, userId?: string | null) {
  const before = await prisma.lead.findUnique({ where: { id } });
  if (!before) return null;

  const data: Record<string, unknown> = { ...input };
  if ("phone" in input) data.phone = normalizePhone(input.phone) ?? input.phone ?? null;
  if ("whatsapp" in input) data.whatsapp = normalizePhone(input.whatsapp) ?? input.whatsapp ?? null;

  const merged = { ...before, ...data };
  data.score = computeLeadScore(scoreFields(merged as Record<string, unknown>));

  // Moving out of NEW for the first time stamps the first contact.
  if (data.status && data.status !== before.status) {
    if (data.status !== "NEW" && !before.firstContactAt) data.firstContactAt = new Date();
  }

  const lead = await prisma.lead.update({ where: { id }, data: data as Prisma.LeadUpdateInput });

  if (data.status && data.status !== before.status) {
    await logActivity({
      leadId: id,
      userId,
      type: "STATUS_CHANGE",
      title: `Statut : ${before.status} → ${lead.status}`,
      meta: { from: before.status, to: lead.status },
    });
    void runAutomations({
      trigger: "LEAD_STATUS_CHANGED",
      lead,
      extra: { fromStatus: before.status, toStatus: lead.status },
    });
  }

  const tracked = ["name", "phone", "email", "whatsapp", "city", "notes", "pricePerDay", "pricePerHour"] as const;
  const changed = tracked.filter((f) => f in input && (before as Record<string, unknown>)[f] !== (lead as Record<string, unknown>)[f]);
  if (changed.length) {
    await logActivity({
      leadId: id,
      userId,
      type: "FIELD_UPDATE",
      title: `Champs mis à jour : ${changed.join(", ")}`,
    });
  }

  return lead;
}

/** Kanban column data — capped per column so a huge pipeline stays fast. */
export async function getKanbanColumns(filters: LeadFilters, take = 40) {
  const where = buildLeadWhere({ ...filters, status: "ALL" });
  const [leads, counts] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { score: "desc" },
      select: {
        id: true, name: true, city: true, status: true, score: true, phone: true,
        whatsapp: true, tags: true, lastContactAt: true, nextFollowUpAt: true,
      },
    }),
    prisma.lead.groupBy({ by: ["status"], where, _count: { _all: true } }),
  ]);

  return LEAD_STATUS_ORDER.map((status) => ({
    status,
    total: counts.find((c) => c.status === status)?._count._all ?? 0,
    leads: leads.filter((l) => l.status === status).slice(0, take),
  }));
}
