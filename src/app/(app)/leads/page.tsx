import type { Metadata } from "next";
import { auth } from "@/auth";
import { LeadsWorkspace } from "@/components/leads/leads-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { buildLeadOrderBy, buildLeadWhere, getKanbanColumns, type LeadFilters } from "@/lib/leads";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Prospects" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const session = await auth();
  const canEdit = (session?.user?.role ?? "OPERATOR") !== "VIEWER";

  const view = first(sp.view) === "kanban" ? "kanban" : "table";
  const page = Math.max(1, Number(first(sp.page) ?? 1));
  const perPage = 50;

  const filters: LeadFilters = {
    q: first(sp.q),
    status: first(sp.status),
    city: first(sp.city),
    source: first(sp.source),
    tag: first(sp.tag),
    assignedToId: first(sp.assignedToId),
    sort: first(sp.sort),
  };

  const where = buildLeadWhere(filters);

  const [leads, total, columns, cityGroups, users] = await Promise.all([
    view === "table"
      ? prisma.lead.findMany({
          where,
          orderBy: buildLeadOrderBy(filters.sort),
          skip: (page - 1) * perPage,
          take: perPage,
          select: {
            id: true, name: true, city: true, phone: true, whatsapp: true, email: true,
            status: true, source: true, score: true, tags: true, contactCount: true,
            lastContactAt: true, nextFollowUpAt: true, createdAt: true,
            assignedTo: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve([]),
    prisma.lead.count({ where }),
    view === "kanban" ? getKanbanColumns(filters) : Promise.resolve([]),
    prisma.lead.groupBy({ by: ["city"], orderBy: { city: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Prospects"
        description="Du premier contact jusqu'à la piscine active."
      />
      <LeadsWorkspace
        leads={leads}
        columns={columns}
        total={total}
        page={page}
        pages={Math.max(1, Math.ceil(total / perPage))}
        cities={cityGroups.map((c) => c.city)}
        users={users}
        canEdit={canEdit}
        view={view}
        openNew={first(sp.new) === "1" && canEdit}
        openImport={first(sp.import) === "1" && canEdit}
      />
    </>
  );
}
