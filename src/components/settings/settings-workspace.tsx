"use client";

import { Check, KeyRound, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { TARGET_CITIES } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

type Business = {
  name?: string;
  tagline?: string;
  senderName?: string;
  defaultLanguage?: string;
  defaultCity?: string;
  commissionPercent?: number;
};

const INTEGRATION_META: Record<string, { label: string; env: string; hint: string }> = {
  anthropic: {
    label: "Claude (génération IA)",
    env: "ANTHROPIC_API_KEY",
    hint: "Messages et contenu générés par claude-opus-5.",
  },
  googleMaps: {
    label: "Google Maps",
    env: "GOOGLE_MAPS_API_KEY",
    hint: "Enrichissement des prospects (phase 3).",
  },
  whatsapp: {
    label: "WhatsApp Business",
    env: "WHATSAPP_ACCESS_TOKEN",
    hint: "Envoi automatisé. Sans clé, les liens wa.me restent utilisables.",
  },
  smtp: { label: "Email (SMTP)", env: "SMTP_HOST", hint: "Envoi d'emails sortants." },
  googleOAuth: { label: "Connexion Google", env: "GOOGLE_CLIENT_ID", hint: "Login OAuth optionnel." },
  webhookKey: { label: "Clé webhook n8n", env: "WEBHOOK_API_KEY", hint: "En-tête x-api-key des webhooks." },
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin — accès complet",
  OPERATOR: "Opérateur — prospects, messages, contenu",
  VIEWER: "Lecture seule",
};

export function SettingsWorkspace({
  business,
  integrations,
  users,
  currentUser,
}: {
  business: Business;
  integrations: Record<string, boolean>;
  users: { id: string; name: string; email: string; role: string; createdAt: Date | string }[];
  currentUser: { id: string; name: string; email: string; role: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const isAdmin = currentUser.role === "ADMIN";

  async function saveBusiness(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        key: "business",
        value: {
          name: fd.get("name"),
          tagline: fd.get("tagline"),
          senderName: fd.get("senderName"),
          defaultLanguage: fd.get("defaultLanguage"),
          defaultCity: fd.get("defaultCity"),
          commissionPercent: Number(fd.get("commissionPercent") ?? 15),
        },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.push((await res.json()).error ?? "Échec", "error");
      return;
    }
    toast.push("Réglages enregistrés");
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Informations de l&apos;entreprise</CardTitle>
              <p className="mt-0.5 text-xs text-muted">
                Utilisées dans les modèles de messages et la génération IA.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveBusiness} className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="set-name">Nom</Label>
                <Input id="set-name" name="name" defaultValue={business.name ?? "Masbah.ma"} disabled={!isAdmin} />
              </div>
              <div>
                <Label htmlFor="set-sender">Nom de l&apos;expéditeur ({"{{sender}}"})</Label>
                <Input
                  id="set-sender"
                  name="senderName"
                  defaultValue={business.senderName ?? ""}
                  disabled={!isAdmin}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="set-tagline">Slogan</Label>
                <Input id="set-tagline" name="tagline" defaultValue={business.tagline ?? ""} disabled={!isAdmin} />
              </div>
              <div>
                <Label htmlFor="set-lang">Langue par défaut</Label>
                <Select
                  id="set-lang"
                  name="defaultLanguage"
                  defaultValue={business.defaultLanguage ?? "FR"}
                  disabled={!isAdmin}
                >
                  <option value="FR">Français</option>
                  <option value="AR">العربية (darija)</option>
                  <option value="EN">English</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="set-city">Ville par défaut</Label>
                <Select
                  id="set-city"
                  name="defaultCity"
                  defaultValue={business.defaultCity ?? "Casablanca"}
                  disabled={!isAdmin}
                >
                  {TARGET_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="set-commission">Commission (%)</Label>
                <Input
                  id="set-commission"
                  name="commissionPercent"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={business.commissionPercent ?? 15}
                  disabled={!isAdmin}
                />
              </div>
              {isAdmin && (
                <div className="flex items-end sm:col-span-2">
                  <Button type="submit" loading={saving}>
                    Enregistrer
                  </Button>
                </div>
              )}
              {!isAdmin && (
                <p className="text-xs text-muted sm:col-span-2">
                  Seuls les administrateurs peuvent modifier ces réglages.
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Équipe</CardTitle>
            <Badge className="bg-card-2 text-muted">{users.length}</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <ul className="divide-y divide-line">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink">
                      {u.name}
                      {u.id === currentUser.id && <span className="ml-1.5 text-[10px] text-brand">(vous)</span>}
                    </p>
                    <p className="text-[11px] text-muted">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={
                        u.role === "ADMIN"
                          ? "bg-brand-soft text-brand"
                          : u.role === "OPERATOR"
                            ? "bg-teal-soft text-teal"
                            : "bg-card-2 text-muted"
                      }
                    >
                      {ROLE_LABEL[u.role]?.split(" —")[0] ?? u.role}
                    </Badge>
                    <p className="mt-0.5 text-[10px] text-muted">Depuis {formatDate(u.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="px-5 pt-2 text-[11px] text-muted">
              <Users className="mr-1 inline h-3 w-3" />
              Les comptes se créent via le seed Prisma ou directement en base. Rôles :{" "}
              {Object.values(ROLE_LABEL).join(" · ")}.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Intégrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(INTEGRATION_META).map(([key, meta]) => {
              const on = integrations[key];
              return (
                <div key={key} className="rounded-lg border border-line p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-ink">{meta.label}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        on ? "bg-teal-soft text-teal" : "bg-card-2 text-muted",
                      )}
                    >
                      {on ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {on ? "Configuré" : "Absent"}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted">{meta.hint}</p>
                  <code className="mt-1 block text-[10px] text-muted/80">{meta.env}</code>
                </div>
              );
            })}
            <p className="pt-1 text-[10px] leading-relaxed text-muted">
              <KeyRound className="mr-1 inline h-3 w-3" />
              Les clés se configurent dans le fichier <code>.env</code> puis nécessitent un redémarrage du
              serveur. Elles ne sont jamais exposées au navigateur.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Votre profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <p>
              <span className="text-muted">Nom : </span>
              <span className="font-medium text-ink">{currentUser.name}</span>
            </p>
            <p>
              <span className="text-muted">Email : </span>
              <span className="font-medium text-ink">{currentUser.email}</span>
            </p>
            <p>
              <span className="text-muted">Rôle : </span>
              <span className="font-medium text-ink">{ROLE_LABEL[currentUser.role]}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
