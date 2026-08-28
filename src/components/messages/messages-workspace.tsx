"use client";

import type { Channel, Language } from "@prisma/client";
import { Inbox, MessageCircle, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { MessageComposer, type ComposerTemplate } from "./composer";
import { CHANNEL_LABEL, LEAD_STATUS_CLASS, LEAD_STATUS_LABEL } from "@/lib/constants";
import { cn, formatDate, isArabic, timeAgo } from "@/lib/utils";

export type Thread = {
  id: string;
  name: string;
  city: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  status: keyof typeof LEAD_STATUS_LABEL;
  messages: {
    id: string;
    content: string;
    channel: Channel;
    direction: "INBOUND" | "OUTBOUND";
    aiGenerated: boolean;
    createdAt: Date | string;
  }[];
};

const CATEGORY_LABEL: Record<string, string> = {
  INITIAL_OUTREACH: "Premier contact",
  FOLLOW_UP_1: "Relance #1",
  FOLLOW_UP_2: "Relance #2",
  ONBOARDING: "Onboarding",
  RE_ENGAGEMENT: "Réengagement",
  CUSTOM: "Personnalisé",
};

export function MessagesWorkspace({
  threads,
  templates,
  senderName,
  canEdit,
}: {
  threads: Thread[];
  templates: (ComposerTemplate & { usageCount: number; isActive: boolean; subject: string | null })[];
  senderName: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"threads" | "templates">("threads");
  const [activeId, setActiveId] = useState(threads[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<(typeof templates)[number] | "new" | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return threads;
    const q = query.toLowerCase();
    return threads.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [threads, query]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  async function deleteTemplate(id: string) {
    if (!confirm("Supprimer ce modèle ?")) return;
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.push("Suppression impossible", "error");
      return;
    }
    toast.push("Modèle supprimé");
    router.refresh();
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-card p-0.5">
          {(
            [
              ["threads", "Conversations"],
              ["templates", "Modèles"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "h-8 rounded-md px-3 text-xs font-medium transition-colors",
                tab === k ? "bg-brand-soft text-brand" : "text-muted hover:text-ink",
              )}
            >
              {label}
              {k === "templates" && (
                <span className="ml-1.5 text-[10px] text-muted">{templates.length}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "templates" && canEdit && (
          <Button size="sm" className="ml-auto" onClick={() => setEditingTemplate("new")}>
            <Plus className="h-4 w-4" />
            Nouveau modèle
          </Button>
        )}
      </div>

      {tab === "threads" ? (
        threads.length === 0 ? (
          <Card>
            <EmptyState
              icon={Inbox}
              title="Aucune conversation"
              description="Envoyez un premier message depuis la fiche d'un prospect."
              action={
                <Link href="/leads">
                  <Button size="sm">Voir les prospects</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <Card className="overflow-hidden">
              <div className="border-b border-line p-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher…"
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
              <ul className="max-h-[calc(100dvh-260px)] divide-y divide-line overflow-y-auto">
                {filtered.map((t) => {
                  const last = t.messages[0];
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => setActiveId(t.id)}
                        className={cn(
                          "w-full px-3.5 py-3 text-left transition-colors hover:bg-card-2",
                          activeId === t.id && "bg-brand-soft",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-ink">{t.name}</span>
                          <span className="shrink-0 text-[10px] text-muted">
                            {last ? timeAgo(last.createdAt) : ""}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-[11px] text-muted">
                          {last?.direction === "INBOUND" && (
                            <span className="mr-1 font-medium text-teal">↩</span>
                          )}
                          {last?.content ?? "—"}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <Badge className={LEAD_STATUS_CLASS[t.status]}>
                            {LEAD_STATUS_LABEL[t.status]}
                          </Badge>
                          <span className="text-[10px] text-muted">{t.city}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="px-4 py-8 text-center text-xs text-muted">Aucun résultat</li>
                )}
              </ul>
            </Card>

            <div className="space-y-4">
              {active ? (
                <>
                  <Card>
                    <CardHeader>
                      <div>
                        <CardTitle>
                          <Link href={`/leads/${active.id}`} className="hover:text-brand">
                            {active.name}
                          </Link>
                        </CardTitle>
                        <p className="mt-0.5 text-xs text-muted">
                          {active.city} · {active.messages.length} message(s)
                        </p>
                      </div>
                      <Badge className={LEAD_STATUS_CLASS[active.status]}>
                        {LEAD_STATUS_LABEL[active.status]}
                      </Badge>
                    </CardHeader>
                    <CardContent className="max-h-[38vh] space-y-3 overflow-y-auto">
                      {[...active.messages].reverse().map((m) => {
                        const outbound = m.direction === "OUTBOUND";
                        const rtl = isArabic(m.content);
                        return (
                          <div key={m.id} className={cn("flex", outbound ? "justify-end" : "justify-start")}>
                            <div
                              className={cn(
                                "max-w-[85%] rounded-xl px-3.5 py-2.5",
                                outbound ? "rounded-br-sm bg-brand-soft" : "rounded-bl-sm bg-card-2",
                              )}
                            >
                              <p
                                dir={rtl ? "rtl" : "ltr"}
                                className={cn(
                                  "whitespace-pre-wrap text-xs leading-relaxed text-ink",
                                  rtl && "font-arabic text-right",
                                )}
                              >
                                {m.content}
                              </p>
                              <p className="mt-1.5 text-[10px] text-muted">
                                {CHANNEL_LABEL[m.channel]} · {formatDate(m.createdAt, true)}
                                {m.aiGenerated && <span className="ml-1 text-brand">· IA</span>}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {canEdit && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Répondre</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <MessageComposer lead={active} templates={templates} senderName={senderName} />
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <EmptyState icon={MessageCircle} title="Choisissez une conversation" />
                </Card>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => {
            const rtl = isArabic(t.body);
            return (
              <Card key={t.id} className="flex flex-col">
                <CardHeader>
                  <div className="min-w-0">
                    <CardTitle className="truncate">{t.name}</CardTitle>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {CATEGORY_LABEL[t.category] ?? t.category} · {CHANNEL_LABEL[t.channel]} ·{" "}
                      {t.language}
                    </p>
                  </div>
                  <Badge className="bg-card-2 text-muted">{t.usageCount}×</Badge>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p
                    dir={rtl ? "rtl" : "ltr"}
                    className={cn(
                      "line-clamp-6 flex-1 whitespace-pre-wrap rounded-lg bg-card-2 p-3 text-[11px] leading-relaxed text-muted",
                      rtl && "font-arabic text-right",
                    )}
                  >
                    {t.body}
                  </p>
                  {canEdit && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditingTemplate(t)}
                      >
                        Modifier
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteTemplate(t.id)} aria-label="Supprimer">
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {templates.length === 0 && (
            <Card className="md:col-span-2 xl:col-span-3">
              <EmptyState
                icon={Sparkles}
                title="Aucun modèle"
                description="Créez vos modèles de prospection en français et en darija."
              />
            </Card>
          )}
        </div>
      )}

      <TemplateModal
        template={editingTemplate}
        onClose={() => setEditingTemplate(null)}
        onSaved={() => {
          setEditingTemplate(null);
          router.refresh();
        }}
      />
    </>
  );
}

function TemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: (ComposerTemplate & { subject: string | null }) | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const isNew = template === "new";
  const t = isNew ? null : template;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch(isNew ? "/api/templates" : `/api/templates/${t!.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      toast.push((await res.json()).error ?? "Échec", "error");
      return;
    }
    toast.push(isNew ? "Modèle créé" : "Modèle mis à jour");
    onSaved();
  }

  return (
    <Modal
      open={template !== null}
      onClose={onClose}
      title={isNew ? "Nouveau modèle" : "Modifier le modèle"}
      description="Variables disponibles : {{name}}, {{city}}, {{sender}}"
      className="max-w-xl"
    >
      <form onSubmit={submit} className="space-y-3" key={isNew ? "new" : t?.id}>
        <div>
          <Label htmlFor="tpl-name">Nom</Label>
          <Input id="tpl-name" name="name" required defaultValue={t?.name ?? ""} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="tpl-channel">Canal</Label>
            <Select id="tpl-channel" name="channel" defaultValue={t?.channel ?? "WHATSAPP"}>
              {Object.entries(CHANNEL_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tpl-lang">Langue</Label>
            <Select id="tpl-lang" name="language" defaultValue={(t?.language as Language) ?? "FR"}>
              <option value="FR">Français</option>
              <option value="AR">العربية</option>
              <option value="EN">English</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="tpl-cat">Catégorie</Label>
            <Select id="tpl-cat" name="category" defaultValue={t?.category ?? "CUSTOM"}>
              {Object.entries(CATEGORY_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="tpl-body">Contenu</Label>
          <Textarea id="tpl-body" name="body" required rows={9} defaultValue={t?.body ?? ""} />
        </div>
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
