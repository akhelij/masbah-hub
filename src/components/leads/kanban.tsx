"use client";

import type { LeadStatus } from "@prisma/client";
import { CalendarClock, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { LEAD_STATUS_CLASS, LEAD_STATUS_LABEL } from "@/lib/constants";
import { scoreBand } from "@/lib/scoring";
import { cn, timeAgo, whatsappLink } from "@/lib/utils";

export type KanbanLead = {
  id: string;
  name: string;
  city: string;
  status: LeadStatus;
  score: number;
  phone: string | null;
  whatsapp: string | null;
  tags: string[];
  lastContactAt: Date | string | null;
  nextFollowUpAt: Date | string | null;
};

export type KanbanColumn = { status: LeadStatus; total: number; leads: KanbanLead[] };

export function Kanban({ columns, canEdit }: { columns: KanbanColumn[]; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<LeadStatus | null>(null);
  const [local, setLocal] = useState(columns);

  // Keep local state in sync when the server sends new data.
  const signature = columns.map((c) => `${c.status}:${c.total}`).join("|");
  const [lastSignature, setLastSignature] = useState(signature);
  if (signature !== lastSignature) {
    setLastSignature(signature);
    setLocal(columns);
  }

  async function move(leadId: string, status: LeadStatus) {
    const from = local.find((c) => c.leads.some((l) => l.id === leadId));
    if (!from || from.status === status) return;

    // Optimistic move.
    setLocal((cols) => {
      const lead = from.leads.find((l) => l.id === leadId)!;
      return cols.map((c) => {
        if (c.status === from.status)
          return { ...c, total: c.total - 1, leads: c.leads.filter((l) => l.id !== leadId) };
        if (c.status === status)
          return { ...c, total: c.total + 1, leads: [{ ...lead, status }, ...c.leads] };
        return c;
      });
    });

    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      toast.push("Impossible de déplacer le prospect", "error");
      setLocal(columns);
      return;
    }
    toast.push(`Statut → ${LEAD_STATUS_LABEL[status]}`);
    router.refresh();
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {local.map((col) => (
        <div
          key={col.status}
          onDragOver={(e) => {
            if (!canEdit) return;
            e.preventDefault();
            setOver(col.status);
          }}
          onDragLeave={() => setOver((s) => (s === col.status ? null : s))}
          onDrop={(e) => {
            e.preventDefault();
            setOver(null);
            if (canEdit && dragging) move(dragging, col.status);
            setDragging(null);
          }}
          className={cn(
            "flex w-[268px] shrink-0 flex-col rounded-xl border bg-card-2/40 transition-colors",
            over === col.status ? "border-brand bg-brand-soft/40" : "border-line",
          )}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
            <span className="text-xs font-semibold text-ink">{LEAD_STATUS_LABEL[col.status]}</span>
            <Badge className={LEAD_STATUS_CLASS[col.status]}>{col.total}</Badge>
          </div>

          <div className="flex max-h-[calc(100dvh-300px)] flex-col gap-2 overflow-y-auto px-2 pb-2">
            {col.leads.length === 0 && (
              <p className="px-2 py-6 text-center text-[11px] text-muted">Vide</p>
            )}
            {col.leads.map((lead) => {
              const band = scoreBand(lead.score);
              const wa = whatsappLink(lead.whatsapp ?? lead.phone);
              const overdue = lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) <= new Date();
              return (
                <div
                  key={lead.id}
                  draggable={canEdit}
                  onDragStart={() => setDragging(lead.id)}
                  onDragEnd={() => setDragging(null)}
                  className={cn(
                    "group rounded-lg border border-line bg-card p-2.5 transition-shadow hover:shadow-md",
                    canEdit && "cursor-grab active:cursor-grabbing",
                    dragging === lead.id && "opacity-40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="min-w-0 flex-1 text-xs font-medium text-ink hover:text-brand"
                    >
                      <span className="line-clamp-2">{lead.name}</span>
                    </Link>
                    <Badge className={band.className}>{lead.score}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{lead.city}</p>

                  {lead.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {lead.tags.slice(0, 3).map((t) => (
                        <span key={t} className="rounded bg-card-2 px-1.5 py-0.5 text-[10px] text-muted">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted">
                    <span>{lead.lastContactAt ? timeAgo(lead.lastContactAt) : "Jamais contacté"}</span>
                    <div className="flex items-center gap-1.5">
                      {overdue && <CalendarClock className="h-3 w-3 text-danger" />}
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {col.total > col.leads.length && (
              <p className="px-2 py-1 text-center text-[10px] text-muted">
                +{col.total - col.leads.length} autres
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
