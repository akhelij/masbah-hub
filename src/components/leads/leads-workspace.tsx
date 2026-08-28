"use client";

import type { LeadStatus } from "@prisma/client";
import {
  Columns3,
  Download,
  Filter,
  Plus,
  Search,
  Table2,
  Upload,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ImportModal } from "./import-modal";
import { Kanban, type KanbanColumn } from "./kanban";
import { LeadForm } from "./lead-form";
import {
  LEAD_SOURCE_LABEL,
  LEAD_STATUS_CLASS,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_ORDER,
} from "@/lib/constants";
import { scoreBand } from "@/lib/scoring";
import { cn, timeAgo, whatsappLink } from "@/lib/utils";

export type LeadRow = {
  id: string;
  name: string;
  city: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  status: LeadStatus;
  source: string;
  score: number;
  tags: string[];
  contactCount: number;
  lastContactAt: Date | string | null;
  nextFollowUpAt: Date | string | null;
  createdAt: Date | string;
  assignedTo: { id: string; name: string } | null;
};

type Props = {
  leads: LeadRow[];
  columns: KanbanColumn[];
  total: number;
  page: number;
  pages: number;
  cities: string[];
  users: { id: string; name: string }[];
  canEdit: boolean;
  view: "table" | "kanban";
  openNew: boolean;
  openImport: boolean;
};

export function LeadsWorkspace(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [selected, setSelected] = useState<string[]>([]);
  const [showNew, setShowNew] = useState(props.openNew);
  const [showImport, setShowImport] = useState(props.openImport);
  const [query, setQuery] = useState(params.get("q") ?? "");

  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "" || v === "ALL") next.delete(k);
        else next.set(k, v);
      }
      if (!("page" in updates)) next.delete("page");
      startTransition(() => router.push(`${pathname}?${next.toString()}`));
    },
    [params, pathname, router],
  );

  // Debounced search.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (query === current) return;
    const t = setTimeout(() => setParam({ q: query || null }), 350);
    return () => clearTimeout(t);
  }, [query, params, setParam]);

  const activeFilters = useMemo(
    () => ["status", "city", "source", "tag", "assignedToId"].filter((k) => params.get(k)),
    [params],
  );

  const allSelected = props.leads.length > 0 && selected.length === props.leads.length;

  async function bulk(body: Record<string, unknown>) {
    const res = await fetch("/api/leads/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: selected, ...body }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.push(json.error ?? "Action échouée", "error");
      return;
    }
    toast.push(`${selected.length} prospects mis à jour`);
    setSelected([]);
    router.refresh();
  }

  const exportHref = `/api/leads/export?${params.toString()}`;

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, ville, téléphone, note…"
            className="pl-9"
          />
        </div>

        <Select
          value={params.get("status") ?? "ALL"}
          onChange={(e) => setParam({ status: e.target.value })}
          className="w-auto min-w-[140px]"
        >
          <option value="ALL">Tous les statuts</option>
          {LEAD_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>

        <Select
          value={params.get("city") ?? "ALL"}
          onChange={(e) => setParam({ city: e.target.value })}
          className="w-auto min-w-[130px]"
        >
          <option value="ALL">Toutes les villes</option>
          {props.cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <Select
          value={params.get("source") ?? "ALL"}
          onChange={(e) => setParam({ source: e.target.value })}
          className="w-auto min-w-[130px]"
        >
          <option value="ALL">Toutes les sources</option>
          {Object.entries(LEAD_SOURCE_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>

        <Select
          value={params.get("sort") ?? "recent"}
          onChange={(e) => setParam({ sort: e.target.value })}
          className="w-auto min-w-[130px]"
        >
          <option value="recent">Plus récents</option>
          <option value="oldest">Plus anciens</option>
          <option value="score">Meilleur score</option>
          <option value="name">Nom (A-Z)</option>
          <option value="city">Ville</option>
          <option value="lastContact">Dernier contact</option>
        </Select>

        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setParam({ status: null, city: null, source: null, tag: null, assignedToId: null })
            }
          >
            <X className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border border-line bg-card p-0.5">
            {(
              [
                ["table", Table2, "Tableau"],
                ["kanban", Columns3, "Kanban"],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                onClick={() => setParam({ view: v })}
                title={label}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                  props.view === v ? "bg-brand-soft text-brand" : "text-muted hover:text-ink",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>

          <a href={exportHref} download>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exporter</span>
            </Button>
          </a>

          {props.canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Importer</span>
              </Button>
              <Button size="sm" onClick={() => setShowNew(true)}>
                <Plus className="h-4 w-4" />
                Nouveau
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bulk bar */}
      {selected.length > 0 && props.canEdit && (
        <div className="animate-fade-up mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand-soft px-3 py-2">
          <span className="text-xs font-medium text-brand">{selected.length} sélectionné(s)</span>
          <Select
            className="h-8 w-auto text-xs"
            defaultValue=""
            onChange={(e) => e.target.value && bulk({ action: "status", status: e.target.value })}
          >
            <option value="">Changer le statut…</option>
            {LEAD_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
          <Select
            className="h-8 w-auto text-xs"
            defaultValue=""
            onChange={(e) => e.target.value && bulk({ action: "assign", assignedToId: e.target.value })}
          >
            <option value="">Assigner à…</option>
            {props.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <Button variant="outline" size="sm" onClick={() => bulk({ action: "followUp", days: 3 })}>
            Relance J+3
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            Annuler
          </Button>
        </div>
      )}

      <p className="mb-3 text-xs text-muted">
        {props.total} prospect{props.total > 1 ? "s" : ""}
        {activeFilters.length > 0 && " (filtrés)"}
        {pending && " · chargement…"}
      </p>

      {props.view === "kanban" ? (
        <Kanban columns={props.columns} canEdit={props.canEdit} />
      ) : props.leads.length === 0 ? (
        <div className="rounded-xl border border-line bg-card">
          <EmptyState
            icon={Users}
            title="Aucun prospect"
            description="Ajoutez un prospect manuellement ou importez un CSV depuis Google Maps."
            action={
              props.canEdit ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setShowNew(true)}>
                    <Plus className="h-4 w-4" />
                    Nouveau prospect
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
                    <Upload className="h-3.5 w-3.5" />
                    Importer un CSV
                  </Button>
                </div>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-card-2/50 text-left text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  {props.canEdit && (
                    <th className="w-10 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => setSelected(e.target.checked ? props.leads.map((l) => l.id) : [])}
                        className="h-3.5 w-3.5 accent-[#1e40af]"
                        aria-label="Tout sélectionner"
                      />
                    </th>
                  )}
                  <th className="px-3 py-2.5 font-medium">Prospect</th>
                  <th className="px-3 py-2.5 font-medium">Ville</th>
                  <th className="px-3 py-2.5 font-medium">Statut</th>
                  <th className="px-3 py-2.5 font-medium">Score</th>
                  <th className="hidden px-3 py-2.5 font-medium lg:table-cell">Source</th>
                  <th className="hidden px-3 py-2.5 font-medium lg:table-cell">Contact</th>
                  <th className="hidden px-3 py-2.5 font-medium xl:table-cell">Assigné</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {props.leads.map((lead) => {
                  const band = scoreBand(lead.score);
                  const wa = whatsappLink(lead.whatsapp ?? lead.phone);
                  const isSelected = selected.includes(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      className={cn("transition-colors hover:bg-card-2/60", isSelected && "bg-brand-soft/50")}
                    >
                      {props.canEdit && (
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              setSelected((s) =>
                                e.target.checked ? [...s, lead.id] : s.filter((id) => id !== lead.id),
                              )
                            }
                            className="h-3.5 w-3.5 accent-[#1e40af]"
                            aria-label={`Sélectionner ${lead.name}`}
                          />
                        </td>
                      )}
                      <td className="px-3 py-2.5">
                        <Link href={`/leads/${lead.id}`} className="font-medium text-ink hover:text-brand">
                          {lead.name}
                        </Link>
                        <p className="text-[11px] text-muted">{lead.phone ?? lead.email ?? "—"}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted">{lead.city}</td>
                      <td className="px-3 py-2.5">
                        <Badge className={LEAD_STATUS_CLASS[lead.status]}>
                          {LEAD_STATUS_LABEL[lead.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge className={band.className}>{lead.score}</Badge>
                      </td>
                      <td className="hidden px-3 py-2.5 text-xs text-muted lg:table-cell">
                        {LEAD_SOURCE_LABEL[lead.source as keyof typeof LEAD_SOURCE_LABEL] ?? lead.source}
                      </td>
                      <td className="hidden px-3 py-2.5 text-xs text-muted lg:table-cell">
                        {lead.lastContactAt ? timeAgo(lead.lastContactAt) : "Jamais"}
                      </td>
                      <td className="hidden px-3 py-2.5 text-xs text-muted xl:table-cell">
                        {lead.assignedTo?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-teal hover:underline"
                          >
                            WhatsApp
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {props.pages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
              <span className="text-xs text-muted">
                Page {props.page} sur {props.pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={props.page <= 1}
                  onClick={() => setParam({ page: String(props.page - 1) })}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={props.page >= props.pages}
                  onClick={() => setParam({ page: String(props.page + 1) })}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Nouveau prospect"
        description="Le score de priorité est calculé automatiquement."
        className="max-w-2xl"
      >
        <LeadForm users={props.users} onDone={() => setShowNew(false)} />
      </Modal>

      <ImportModal open={showImport} onClose={() => setShowImport(false)} />
    </>
  );
}
