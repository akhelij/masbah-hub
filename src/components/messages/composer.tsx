"use client";

import type { Channel, Language } from "@prisma/client";
import { Copy, Send, Sparkles, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { CHANNEL_LABEL, TONES } from "@/lib/constants";
import { isArabic, renderTemplate, whatsappLink } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type ComposerTemplate = {
  id: string;
  name: string;
  body: string;
  language: Language;
  channel: Channel;
  category: string;
};

export type ComposerLead = {
  id: string;
  name: string;
  city: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
};

export function MessageComposer({
  lead,
  templates,
  senderName = "Youssef",
  compact = false,
}: {
  lead: ComposerLead;
  templates: ComposerTemplate[];
  senderName?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [content, setContent] = useState("");
  const [channel, setChannel] = useState<Channel>("WHATSAPP");
  const [language, setLanguage] = useState<Language>("FR");
  const [tone, setTone] = useState<"friendly" | "professional" | "urgent">("friendly");
  const [templateId, setTemplateId] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setContent(
      renderTemplate(tpl.body, {
        name: lead.name.split("—")[1]?.trim() ?? lead.name,
        city: lead.city,
        sender: senderName,
      }),
    );
    setLanguage(tpl.language);
    setChannel(tpl.channel);
    setAiGenerated(false);
  }

  async function generate() {
    setGenerating(true);
    const res = await fetch("/api/messages/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, tone, language, channel }),
    });
    const json = await res.json();
    setGenerating(false);
    if (!res.ok) {
      toast.push(json.error ?? "Génération impossible", "error");
      return;
    }
    setContent(json.content);
    setAiGenerated(true);
    setTemplateId("");
    toast.push("Message généré");
  }

  async function logMessage(direction: "OUTBOUND" | "INBOUND" = "OUTBOUND") {
    if (!content.trim()) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        leadId: lead.id,
        channel,
        direction,
        content,
        language,
        templateId: templateId || null,
        aiGenerated,
      }),
    });
    const json = await res.json();
    setSending(false);
    if (!res.ok) {
      toast.push(json.error ?? "Enregistrement impossible", "error");
      return;
    }
    toast.push(direction === "OUTBOUND" ? "Message enregistré comme envoyé" : "Réponse enregistrée");
    setContent("");
    setTemplateId("");
    setAiGenerated(false);
    router.refresh();
  }

  async function sendViaWhatsApp() {
    const link = whatsappLink(lead.whatsapp ?? lead.phone, content);
    if (!link) {
      toast.push("Aucun numéro WhatsApp pour ce prospect", "error");
      return;
    }
    window.open(link, "_blank", "noopener");
    await logMessage("OUTBOUND");
  }

  const rtl = isArabic(content);

  return (
    <div className="space-y-3">
      <div className={cn("grid gap-2", compact ? "grid-cols-2" : "sm:grid-cols-4")}>
        <div>
          <Label htmlFor="composer-channel">Canal</Label>
          <Select
            id="composer-channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
          >
            {Object.entries(CHANNEL_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="composer-lang">Langue</Label>
          <Select
            id="composer-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            <option value="FR">Français</option>
            <option value="AR">العربية (darija)</option>
            <option value="EN">English</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="composer-tone">Ton</Label>
          <Select id="composer-tone" value={tone} onChange={(e) => setTone(e.target.value as typeof tone)}>
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="composer-template">Modèle</Label>
          <Select
            id="composer-template"
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
          >
            <option value="">Aucun</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label className="mb-0">Message</Label>
          <div className="flex items-center gap-2">
            {aiGenerated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand">
                <Sparkles className="h-3 w-3" />
                Généré par IA
              </span>
            )}
            <span className="text-[11px] text-muted">{content.length} caractères</span>
          </div>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          dir={rtl ? "rtl" : "ltr"}
          className={cn("min-h-40", rtl && "font-arabic text-right")}
          placeholder="Écrivez, choisissez un modèle, ou générez avec l'IA…"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={generate} loading={generating} type="button">
          <Wand2 className="h-4 w-4 text-brand" />
          Générer avec l'IA
        </Button>
        <Button
          variant="ghost"
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(content);
            toast.push("Copié dans le presse-papier");
          }}
          disabled={!content.trim()}
        >
          <Copy className="h-4 w-4" />
          Copier
        </Button>

        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => logMessage("INBOUND")}
            disabled={!content.trim()}
          >
            Noter comme reçu
          </Button>
          {channel === "WHATSAPP" ? (
            <Button variant="teal" onClick={sendViaWhatsApp} loading={sending} disabled={!content.trim()}>
              <Send className="h-4 w-4" />
              Ouvrir WhatsApp & enregistrer
            </Button>
          ) : (
            <Button onClick={() => logMessage("OUTBOUND")} loading={sending} disabled={!content.trim()}>
              <Send className="h-4 w-4" />
              Enregistrer l'envoi
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
