"use client";

import type { ActionType, TriggerType } from "@prisma/client";
import { Check, Copy, Plus, Trash2, Webhook, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from "@/lib/constants";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export type Automation = {
  id: string;
  name: string;
  description: string | null;
  trigger: TriggerType;
  action: ActionType;
  conditions: unknown;
  actionConfig: unknown;
  isActive: boolean;
  runCount: number;
  lastRunAt: Date | string | null;
};

export type WebhookLogRow = {
  id: string;
  event: string;
  direction: string;
  endpoint: string | null;
  statusCode: number | null;
  success: boolean;
  response: string | null;
  createdAt: Date | string;
};

const TRIGGER_LABEL: Record<TriggerType, string> = {
  LEAD_CREATED: "Nouveau prospect créé",
  LEAD_STATUS_CHANGED: "Changement de statut",
  MESSAGE_RECEIVED: "Message reçu",
  LEAD_STALE: "Prospect inactif",
};

const ACTION_LABEL: Record<ActionType, string> = {
  SEND_WEBHOOK: "Envoyer un webhook",
  CHANGE_STATUS: "Changer le statut",
  ADD_TAG: "Ajouter un tag",
  SCHEDULE_FOLLOW_UP: "Planifier une relance",
  NOTIFY: "Noter dans l'activité",
};

const ENDPOINTS = [
  { path: "/api/webhooks/new-lead", desc: "Crée un prospect (payload = champs du prospect, name + city requis)." },
  { path: "/api/webhooks/lead-status-change", desc: "Change le statut : { leadId | phone, status, note? }." },
  { path: "/api/webhooks/message-received", desc: "Enregistre une réponse entrante : { phone, content, channel? }." },
];

export function AutomationsWorkspace({
  automations,
  logs,
  appUrl,
  canEdit,
}: {
  automations: Automation[];
  logs: WebhookLogRow[];
  appUrl: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<Automation | "new" | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function toggle(a: Automation) {
    const res = await fetch(`/api/automations/${a.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !a.isActive }),
    });
    if (!res.ok) {
      toast.push("Impossible de modifier", "error");
      return;
    }
    toast.push(a.isActive ? "Automatisation désactivée" : "Automatisation activée");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette automatisation ?")) return;
    const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.push("Suppression impossible", "error");
      return;
    }
    toast.push("Automatisation supprimée");
    router.refresh();
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Règles actives</CardTitle>
              <p className="mt-0.5 text-xs text-muted">
                Déclenchées automatiquement à chaque événement du CRM.
              </p>
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => setEditing("new")}>
                <Plus className="h-4 w-4" />
                Nouvelle règle
              </Button>
            )}
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {automations.length === 0 ? (
              <EmptyState icon={Zap} title="Aucune automatisation" description="Créez votre première règle." />
            ) : (
              <ul className="divide-y divide-line">
                {automations.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                    <button
                      onClick={() => canEdit && toggle(a)}
                      disabled={!canEdit}
                      role="switch"
                      aria-checked={a.isActive}
                      aria-label={a.isActive ? "Désactiver" : "Activer"}
                      className={cn(
                        "mt-0.5 h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors",
                        a.isActive ? "bg-teal" : "bg-line",
                        !canEdit && "opacity-50",
                      )}
                    >
                      <span
                        className={cn(
                          "block h-4 w-4 rounded-full bg-white transition-transform",
                          a.isActive && "translate-x-4",
                        )}
                      />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-ink">{a.name}</p>
                      {a.description && <p className="mt-0.5 text-[11px] text-muted">{a.description}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-brand-soft text-brand">{TRIGGER_LABEL[a.trigger]}</Badge>
                        <span className="text-[10px] text-muted">→</span>
                        <Badge className="bg-teal-soft text-teal">{ACTION_LABEL[a.action]}</Badge>
                        <span className="text-[10px] text-muted">
                          {a.runCount} exécution(s)
                          {a.lastRunAt ? ` · ${timeAgo(a.lastRunAt)}` : ""}
                        </span>
                      </div>
                    </div>

                    {canEdit && (
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(a)}>
                          Modifier
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(a.id)} aria-label="Supprimer">
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Journal des webhooks</CardTitle>
            <span className="text-xs text-muted">{logs.length} derniers</span>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {logs.length === 0 ? (
              <EmptyState icon={Webhook} title="Aucun appel enregistré" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-line text-left text-[10px] uppercase text-muted">
                    <tr>
                      <th className="px-5 py-2 font-medium">Événement</th>
                      <th className="px-3 py-2 font-medium">Sens</th>
                      <th className="px-3 py-2 font-medium">Statut</th>
                      <th className="px-3 py-2 font-medium">Quand</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {logs.map((l) => (
                      <tr key={l.id}>
                        <td className="px-5 py-2">
                          <span className="font-medium text-ink">{l.event}</span>
                          {l.endpoint && (
                            <p className="truncate text-[10px] text-muted">{l.endpoint}</p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {l.direction === "INBOUND" ? "Entrant" : "Sortant"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            className={
                              l.success
                                ? "bg-teal-soft text-teal"
                                : "bg-danger/10 text-danger"
                            }
                          >
                            {l.statusCode ?? (l.success ? "OK" : "ERR")}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted">{formatDate(l.createdAt, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Endpoints n8n</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[11px] leading-relaxed text-muted">
            Appelez ces endpoints depuis n8n (nœud HTTP Request) avec l&apos;en-tête{" "}
            <code className="rounded bg-card-2 px-1 py-0.5 text-[10px]">x-api-key</code> défini dans{" "}
            <code className="rounded bg-card-2 px-1 py-0.5 text-[10px]">WEBHOOK_API_KEY</code>.
          </p>

          {ENDPOINTS.map((e) => {
            const url = `${appUrl}${e.path}`;
            return (
              <div key={e.path} className="rounded-lg border border-line p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <code className="truncate text-[10px] text-ink">POST {e.path}</code>
                  <button
                    onClick={() => copy(url, e.path)}
                    className="shrink-0 text-muted transition-colors hover:text-brand"
                    aria-label="Copier l'URL"
                  >
                    {copied === e.path ? (
                      <Check className="h-3.5 w-3.5 text-teal" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">{e.desc}</p>
              </div>
            );
          })}

          <details className="rounded-lg bg-card-2 p-2.5">
            <summary className="cursor-pointer text-[11px] font-medium text-ink">
              Exemple cURL
            </summary>
            <pre className="mt-2 overflow-x-auto text-[9.5px] leading-relaxed text-muted">
{`curl -X POST ${appUrl}/api/webhooks/new-lead \\
  -H "content-type: application/json" \\
  -H "x-api-key: $WEBHOOK_API_KEY" \\
  -d '{"name":"Villa Test","city":"Casablanca",
       "phone":"0661234567","source":"GOOGLE_MAPS"}'`}
            </pre>
          </details>
        </CardContent>
      </Card>

      <AutomationModal automation={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function AutomationModal({
  automation,
  onClose,
}: {
  automation: Automation | "new" | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const isNew = automation === "new";
  const a = isNew ? null : automation;
  const [action, setAction] = useState<ActionType>(a?.action ?? "SEND_WEBHOOK");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const actionConfig: Record<string, unknown> = {};
    if (action === "SEND_WEBHOOK") actionConfig.url = fd.get("url");
    if (action === "CHANGE_STATUS") actionConfig.status = fd.get("status");
    if (action === "ADD_TAG") actionConfig.tag = fd.get("tag");
    if (action === "SCHEDULE_FOLLOW_UP") actionConfig.days = Number(fd.get("days") ?? 3);
    if (action === "NOTIFY") actionConfig.message = fd.get("message");

    const conditionsRaw = String(fd.get("conditions") ?? "").trim();
    let conditions: unknown = null;
    if (conditionsRaw) {
      try {
        conditions = JSON.parse(conditionsRaw);
      } catch {
        setLoading(false);
        toast.push("Conditions : JSON invalide", "error");
        return;
      }
    }

    const res = await fetch(isNew ? "/api/automations" : `/api/automations/${a!.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        description: fd.get("description") || null,
        trigger: fd.get("trigger"),
        action,
        actionConfig,
        conditions,
        isActive: fd.get("isActive") === "on",
      }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.push((await res.json()).error ?? "Échec", "error");
      return;
    }
    toast.push(isNew ? "Automatisation créée" : "Automatisation mise à jour");
    onClose();
    router.refresh();
  }

  const config = (a?.actionConfig ?? {}) as Record<string, unknown>;

  return (
    <Modal
      open={automation !== null}
      onClose={onClose}
      title={isNew ? "Nouvelle automatisation" : "Modifier l'automatisation"}
      className="max-w-xl"
    >
      <form onSubmit={submit} className="space-y-3" key={isNew ? "new" : a?.id}>
        <div>
          <Label htmlFor="auto-name">Nom</Label>
          <Input id="auto-name" name="name" required defaultValue={a?.name ?? ""} />
        </div>
        <div>
          <Label htmlFor="auto-desc">Description</Label>
          <Input id="auto-desc" name="description" defaultValue={a?.description ?? ""} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="auto-trigger">Déclencheur</Label>
            <Select id="auto-trigger" name="trigger" defaultValue={a?.trigger ?? "LEAD_CREATED"}>
              {Object.entries(TRIGGER_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="auto-action">Action</Label>
            <Select
              id="auto-action"
              value={action}
              onChange={(e) => setAction(e.target.value as ActionType)}
            >
              {Object.entries(ACTION_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {action === "SEND_WEBHOOK" && (
          <div>
            <Label htmlFor="auto-url">URL du webhook (n8n)</Label>
            <Input
              id="auto-url"
              name="url"
              type="url"
              required
              defaultValue={String(config.url ?? "")}
              placeholder="https://n8n.example.com/webhook/masbah"
            />
          </div>
        )}
        {action === "CHANGE_STATUS" && (
          <div>
            <Label htmlFor="auto-status">Nouveau statut</Label>
            <Select id="auto-status" name="status" defaultValue={String(config.status ?? "CONTACTED")}>
              {LEAD_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
        )}
        {action === "ADD_TAG" && (
          <div>
            <Label htmlFor="auto-tag">Tag à ajouter</Label>
            <Input id="auto-tag" name="tag" required defaultValue={String(config.tag ?? "")} />
          </div>
        )}
        {action === "SCHEDULE_FOLLOW_UP" && (
          <div>
            <Label htmlFor="auto-days">Relance dans (jours)</Label>
            <Input id="auto-days" name="days" type="number" min="0" defaultValue={String(config.days ?? 3)} />
          </div>
        )}
        {action === "NOTIFY" && (
          <div>
            <Label htmlFor="auto-message">Message de notification</Label>
            <Input id="auto-message" name="message" defaultValue={String(config.message ?? "")} />
          </div>
        )}

        <div>
          <Label htmlFor="auto-cond">Conditions (JSON, optionnel)</Label>
          <Textarea
            id="auto-cond"
            name="conditions"
            rows={3}
            className="font-mono text-[11px]"
            defaultValue={a?.conditions ? JSON.stringify(a.conditions, null, 2) : ""}
            placeholder={'{"city":"Casablanca","toStatus":"CONTACTED","minScore":50}'}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={a?.isActive ?? true}
            className="h-3.5 w-3.5 accent-[#0d9488]"
          />
          Activer immédiatement
        </label>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
