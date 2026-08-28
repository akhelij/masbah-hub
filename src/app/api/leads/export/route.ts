import type { NextRequest } from "next/server";
import { handleError, requireUser } from "@/lib/api";
import { toCSV } from "@/lib/csv";
import { buildLeadOrderBy, buildLeadWhere } from "@/lib/leads";
import { prisma } from "@/lib/prisma";

const COLUMNS = [
  "id", "name", "phone", "whatsapp", "email", "city", "address", "source", "sourceQuery",
  "status", "score", "rating", "website", "mapsUrl", "latitude", "longitude", "tags",
  "poolName", "pricePerHour", "pricePerDay", "capacity", "amenities", "contactCount",
  "firstContactAt", "lastContactAt", "nextFollowUpAt", "notes", "createdAt",
];

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const sp = request.nextUrl.searchParams;
    const leads = await prisma.lead.findMany({
      where: buildLeadWhere({
        q: sp.get("q") ?? undefined,
        status: sp.get("status") ?? undefined,
        city: sp.get("city") ?? undefined,
        source: sp.get("source") ?? undefined,
        tag: sp.get("tag") ?? undefined,
      }),
      orderBy: buildLeadOrderBy(sp.get("sort") ?? undefined),
    });

    const csv = toCSV(leads as unknown as Record<string, unknown>[], COLUMNS);
    const date = new Date().toISOString().slice(0, 10);

    return new Response("﻿" + csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="masbah-leads-${date}.csv"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
