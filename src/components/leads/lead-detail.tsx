"use client";

import type { Activity, Lead, Message } from "@prisma/client";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Star,
  Trash2,
  Waves,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { LeadForm } from "./lead-form";
import { MessageComposer, type ComposerTemplate } from "@/components/messages/composer";
import {
  CHANNEL_LABEL,
  LEAD_SOURCE_LABEL,
  LEAD_STATUS_CLASS,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_ORDER,
} from "@/lib/constants";
import { scoreBand } from "@/lib/scoring";
import { cn, formatDate, formatMAD, isArabic, telLink, timeAgo, whatsappLink } from "@/lib/utils";

type FullLead = Lead & {
  assignedTo: { id: string; name: string } | null;
  messages: Message[];
  activities: (Activity & { user: { name: string } | null })[];
};

const TABS = [
  { key: "timeline", label: "Activité" },
  { key: "messages", label: "Messages" },
  { key: "pool", label: "Piscine" },
] as const;

export function LeadDetail({
  lead,
  templates,
  users,
  canEdit,
  isAdmin,
  senderName,
}: {
  lead: FullLead;
  templates: ComposerTemplate[];
  users: { id: string; name: string }[];
  canEdit: boolean;
  isAdmin: boolean;
  senderName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("timeline");
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  const band = scoreBand(lead.score);
  const wa = whatsappLink(lead.whatsapp ?? lead.phone);
  const tel = telLink(lead.phone);

  async function patch(data: Record<string, unknown>, successMessage: string) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.push(json.error ?? "Échec", "error");
      return false;
    }
    toast.push(successMessage);
    router.refresh();
    return true;
  }

  async function remove() {
    if (!confirm(`Supprimer définitivement « ${lead.name} » ? Cette action est irréversible.`)) return;
    const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      toast.push(json.error ?? "Suppression impossible", "error");
      return;
    }
    toast.push("Prospect supprimé");
    router.push("/leads");
  }

  return (
    <>
      <Link
        href="/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Tous les prospects
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-ink">{lead.name}</h1>
            <Badge className={LEAD_STATUS_CLASS[lead.status]}>{LEAD_STATUS_LABEL[lead.status]}</Badge>
            <Badge className={band.className}>
              Score {lead.score} · {band.label}
            </Badge>
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {lead.address ? `${lead.address}, ${lead.city}` : lead.city}
            </span>
            <span>{LEAD_SOURCE_LABEL[lead.source]}</span>
            {lead.rating && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-sand" />
                {lead.rating}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Créé {timeAgo(lead.createdAt)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer">
              <Button variant="teal" size="sm">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </a>
          )}
          {tel && (
            <a href={tel}>
              <Button variant="outline" size="sm">
                <Phone className="h-4 w-4" />
                Appeler
              </Button>
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`}>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </a>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={remove} aria-label="Supprimer">
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Composer un message</CardTitle>
                <span className="text-[11px] text-muted">{lead.contactCount} contact(s)</span>
              </CardHeader>
              <CardContent>
                <MessageComposer
                  lead={{
                    id: lead.id,
                    name: lead.name,
                    city: lead.city,
                    phone: lead.phone,
                    whatsapp: lead.whatsapp,
                    email: lead.email,
                  }}
                  templates={templates}
                  senderName={senderName}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <div className="flex gap-1 border-b border-line px-3 pt-3">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "rounded-t-lg px-3 py-2 text-xs font-medium transition-colors",
                    tab === t.key
                      ? "border-b-2 border-brand text-brand"
                      : "text-muted hover:text-ink",
                  )}
                >
                  {t.label}
                  {t.key === "messages" && lead.messages.length > 0 && (
                    <span className="ml-1.5 rounded bg-card-2 px-1.5 text-[10px]">
                      {lead.messages.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <CardContent className="pt-4">
              {tab === "timeline" && (
                <ol className="relative space-y-4 border-l border-line pl-5">
                  {lead.activities.length === 0 && (
                    <li className="text-xs text-muted">Aucune activité pour l'instant.</li>
                  )}
                  {lead.activities.map((a) => (
                    <li key={a.id} className="relative">
                      <span
                        className={cn(
                          "absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card",
                          a.type === "MESSAGE_RECEIVED"
                            ? "bg-teal"
                            : a.type === "STATUS_CHANGE"
                              ? "bg-brand"
                              : a.type === "AUTOMATION"
                                ? "bg-sand"
                                : "bg-muted",
                        )}
                      />
                      <p className="text-xs font-medium text-ink">{a.title}</p>
                      {a.detail && (
                        <p className="mt-0.5 line-clamp-3 text-[11px] leading-relaxed text-muted">
                          {a.detail}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-muted">
                        {formatDate(a.createdAt, true)}
                        {a.user?.name ? ` · ${a.user.name}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )}

              {tab === "messages" && (
                <div className="space-y-3">
                  {lead.messages.length === 0 && (
                    <p className="text-xs text-muted">Aucun message échangé.</p>
                  )}
                  {[...lead.messages].reverse().map((m) => {
                    const outbound = m.direction === "OUTBOUND";
                    const rtl = isArabic(m.content);
                    return (
                      <div key={m.id} className={cn("flex", outbound ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[85%] rounded-xl px-3.5 py-2.5",
                            outbound
                              ? "rounded-br-sm bg-brand-soft text-ink"
                              : "rounded-bl-sm bg-card-2 text-ink",
                          )}
                        >
                          <p
                            dir={rtl ? "rtl" : "ltr"}
                            className={cn("whitespace-pre-wrap text-xs leading-relaxed", rtl && "font-arabic text-right")}
                          >
                            {m.content}
                          </p>
                          <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted">
                            {CHANNEL_LABEL[m.channel]} · {formatDate(m.createdAt, true)}
                            {m.aiGenerated && <span className="text-brand">· IA</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "pool" && (
                <dl className="grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2">
                  {[
                    ["Nom de la piscine", lead.poolName],
                    ["Ville", lead.poolCity ?? lead.city],
                    ["Prix / heure", lead.pricePerHour ? formatMAD(lead.pricePerHour) : null],
                    ["Prix / journée", lead.pricePerDay ? formatMAD(lead.pricePerDay) : null],
                    ["Capacité", lead.capacity ? `${lead.capacity} personnes` : null],
                    ["Équipements", lead.amenities.length ? lead.amenities.join(", ") : null],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <dt className="text-muted">{label}</dt>
                      <dd className="mt-0.5 font-medium text-ink">{value ?? "—"}</dd>
                    </div>
                  ))}
                  {!lead.poolName && (
                    <p className="sm:col-span-2 mt-2 rounded-lg bg-card-2 px-3 py-2.5 text-[11px] text-muted">
                      <Waves className="mr-1.5 inline h-3.5 w-3.5" />
                      Ces informations se remplissent lors de l&apos;onboarding, une fois que le propriétaire
                      accepte de publier sa piscine.
                    </p>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="detail-status">
                  Statut
                </label>
                <Select
                  id="detail-status"
                  value={lead.status}
                  disabled={!canEdit}
                  onChange={(e) => patch({ status: e.target.value }, "Statut mis à jour")}
                >
                  {LEAD_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {LEAD_STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="detail-assign">
                  Assigné à
                </label>
                <Select
                  id="detail-assign"
                  value={lead.assignedToId ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => patch({ assignedToId: e.target.value || null }, "Assignation mise à jour")}
                >
                  <option value="">Non assigné</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  {[3, 7, 14].map((days) => (
                    <Button
                      key={days}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        patch(
                          { nextFollowUpAt: new Date(Date.now() + days * 86_400_000).toISOString() },
                          `Relance planifiée dans ${days} jours`,
                        )
                      }
                    >
                      J+{days}
                    </Button>
                  ))}
                </div>
              )}
              {lead.nextFollowUpAt && (
                <p
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px]",
                    new Date(lead.nextFollowUpAt) <= new Date()
                      ? "bg-danger/10 text-danger"
                      : "bg-card-2 text-muted",
                  )}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Relance {timeAgo(lead.nextFollowUpAt)} ({formatDate(lead.nextFollowUpAt)})
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {[
                [Phone, "Téléphone", lead.phone],
                [MessageCircle, "WhatsApp", lead.whatsapp],
                [Mail, "Email", lead.email],
                [Globe, "Site web", lead.website],
              ].map(([Icon, label, value]) => {
                const I = Icon as typeof Phone;
                return (
                  <div key={String(label)} className="flex items-center gap-2">
                    <I className="h-3.5 w-3.5 shrink-0 text-muted" />
                    <span className="text-muted">{String(label)} :</span>
                    <span className="truncate font-medium text-ink">{(value as string) ?? "—"}</span>
                  </div>
                );
              })}
              {lead.mapsUrl && (
                <a
                  href={lead.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-brand hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Voir sur Google Maps
                </a>
              )}
              {lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {lead.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/leads?tag=${encodeURIComponent(t)}`}
                      className="rounded-full bg-card-2 px-2 py-0.5 text-[10px] text-muted hover:text-brand"
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!canEdit}
                rows={5}
                placeholder="Contexte, objections, préférences horaires…"
              />
              {canEdit && (
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  loading={savingNotes}
                  disabled={notes === (lead.notes ?? "")}
                  onClick={async () => {
                    setSavingNotes(true);
                    await patch({ notes }, "Notes enregistrées");
                    setSavingNotes(false);
                  }}
                >
                  Enregistrer les notes
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Modifier le prospect" className="max-w-2xl">
        <LeadForm
          initial={lead as unknown as Record<string, unknown>}
          users={users}
          onDone={() => setEditing(false)}
        />
      </Modal>
    </>
  );
}
