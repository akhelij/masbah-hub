import type { NextRequest } from "next/server";
import { handleError, ok, requireUser, requireWriteAccess } from "@/lib/api";
import { buildLeadOrderBy, buildLeadWhere, createLead } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { createLeadSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const perPage = Math.min(200, Math.max(1, Number(sp.get("perPage") ?? 50)));

    const where = buildLeadWhere({
      q: sp.get("q") ?? undefined,
      status: sp.get("status") ?? undefined,
      city: sp.get("city") ?? undefined,
      source: sp.get("source") ?? undefined,
      tag: sp.get("tag") ?? undefined,
      assignedToId: sp.get("assignedToId") ?? undefined,
    });

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: buildLeadOrderBy(sp.get("sort") ?? undefined),
        skip: (page - 1) * perPage,
        take: perPage,
        include: { assignedTo: { select: { id: true, name: true } } },
      }),
      prisma.lead.count({ where }),
    ]);

    return ok({ leads, total, page, perPage, pages: Math.ceil(total / perPage) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = requireWriteAccess(await requireUser());
    const body = await request.json();
    const input = createLeadSchema.parse(body);
    const lead = await createLead(input, user.id);
    return ok(lead, 201);
  } catch (err) {
    return handleError(err);
  }
}
