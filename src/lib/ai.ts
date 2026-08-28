import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

export class AINotConfiguredError extends Error {
  constructor() {
    super(
      "ANTHROPIC_API_KEY manquant. Ajoutez la clé dans .env pour activer la génération IA.",
    );
    this.name = "AINotConfiguredError";
  }
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new AINotConfiguredError();
  client ??= new Anthropic();
  return client;
}

export function isAIConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Concatenates the text blocks of a response, ignoring thinking blocks. */
function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

async function ask(system: string, user: string, maxTokens = 4000): Promise<string> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system,
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal") {
    throw new Error("La génération a été refusée par le modèle. Reformulez la demande.");
  }
  return textOf(response);
}

/** Tolerant JSON extraction — the model may wrap JSON in prose or a code fence. */
function extractJSON<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(candidate.slice(start, end + 1)) as T;
    throw new Error("Réponse IA illisible (JSON invalide).");
  }
}

const BRAND_CONTEXT = `Masbah.ma est une marketplace marocaine de location de piscines privées à l'heure ou à la journée.
Les propriétaires (villas, riads, maisons d'hôtes) publient leur piscine gratuitement et gagnent de l'argent sur leurs créneaux inutilisés.
Les clients réservent un créneau privatif pour la famille ou entre amis.
Public: propriétaires marocains, souvent 35-60 ans, joignables sur WhatsApp.
Ton de marque: chaleureux, direct, concret, jamais corporate. Le darija/français mélangé est naturel au Maroc.`;

// --------------------------------------------------------------- Messages

export type MessageTone = "friendly" | "professional" | "urgent";

export type GenerateMessageInput = {
  leadName: string;
  city: string;
  source?: string | null;
  poolType?: string | null;
  tags?: string[];
  status?: string | null;
  tone: MessageTone;
  language: "FR" | "AR" | "EN";
  channel?: string | null;
  previousMessages?: { direction: string; content: string }[];
  extraInstructions?: string | null;
};

const TONE_HINT: Record<MessageTone, string> = {
  friendly: "chaleureux et humain, comme un message d'une vraie personne",
  professional: "professionnel, clair et crédible, sans jargon",
  urgent: "avec une urgence honnête (saison estivale, places limitées) sans être agressif",
};

const LANG_HINT = {
  FR: "français (français marocain naturel)",
  AR: "arabe marocain (darija) écrit en caractères arabes",
  EN: "anglais",
} as const;

export async function generateOutreachMessage(input: GenerateMessageInput): Promise<string> {
  const history = input.previousMessages?.length
    ? `\n\nHistorique de la conversation (du plus ancien au plus récent):\n${input.previousMessages
        .map((m) => `${m.direction === "INBOUND" ? "Prospect" : "Nous"}: ${m.content}`)
        .join("\n")}`
    : "";

  const system = `${BRAND_CONTEXT}

Tu écris des messages de prospection directe (surtout WhatsApp) pour recruter des propriétaires de piscines.
Règles:
- 4 à 6 lignes maximum. Un message WhatsApp, pas un email marketing.
- Commence par le prénom/nom du prospect.
- Une seule idée forte: gagner de l'argent avec une piscine déjà là, sans frais ni engagement.
- Termine par UN appel à l'action simple (une question fermée à laquelle on répond "oui").
- Pas d'emoji excessif (2 maximum), pas de majuscules criardes, pas de promesse chiffrée inventée.
- Ne mets ni objet, ni signature formelle, ni texte explicatif autour.
Réponds UNIQUEMENT avec le texte du message, rien d'autre.`;

  const user = `Prospect: ${input.leadName}
Ville: ${input.city}
Source: ${input.source ?? "inconnue"}
Type de bien: ${input.poolType ?? "non précisé"}
Tags: ${input.tags?.join(", ") || "aucun"}
Statut actuel dans le CRM: ${input.status ?? "NEW"}
Canal: ${input.channel ?? "WHATSAPP"}
Ton demandé: ${TONE_HINT[input.tone]}
Langue: ${LANG_HINT[input.language]}${
    input.extraInstructions ? `\nConsignes supplémentaires: ${input.extraInstructions}` : ""
  }${history}`;

  return ask(system, user, 2000);
}

// ---------------------------------------------------------------- Content

export type GenerateContentInput = {
  postType: string;
  platform: string;
  topic: string;
  language: "FR" | "AR" | "BOTH";
  extraInstructions?: string | null;
};

export type GeneratedContent = {
  title: string;
  content: string;
  contentAr: string | null;
  hashtags: string[];
  imagePrompt: string;
};

export async function generateContentPost(
  input: GenerateContentInput,
): Promise<GeneratedContent> {
  const system = `${BRAND_CONTEXT}

Tu es le responsable social media de Masbah.ma. Tu écris des posts qui donnent envie, pas des publicités.
Règles:
- Adapte la longueur et le format à la plateforme demandée (Instagram: accroche + corps aéré; TikTok: script court parlé; LinkedIn: plus posé; Facebook: conversationnel).
- Accroche forte sur la première ligne.
- Contexte 100% marocain: villes, saison, familles, weekend, chaleur, prix en dirhams.
- Hashtags: 6 à 12, mélange marocain et niche piscine, sans dièse dupliqué.
- imagePrompt: une description visuelle en anglais, prête à coller dans Midjourney/Higgsfield, cinématographique et concrète.
Réponds UNIQUEMENT avec un objet JSON valide de cette forme:
{"title": string, "content": string, "contentAr": string | null, "hashtags": string[], "imagePrompt": string}`;

  const arabicRule =
    input.language === "BOTH"
      ? "Fournis content en français ET contentAr en arabe marocain (darija en caractères arabes)."
      : input.language === "AR"
        ? "Écris content directement en arabe marocain (darija en caractères arabes) et mets contentAr à null."
        : "Écris content en français et mets contentAr à null.";

  const user = `Type de post: ${input.postType}
Plateforme: ${input.platform}
Sujet: ${input.topic}
${arabicRule}${input.extraInstructions ? `\nConsignes supplémentaires: ${input.extraInstructions}` : ""}`;

  const raw = await ask(system, user, 8000);
  const parsed = extractJSON<GeneratedContent>(raw);
  return {
    title: parsed.title ?? input.topic,
    content: parsed.content ?? "",
    contentAr: parsed.contentAr ?? null,
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 15) : [],
    imagePrompt: parsed.imagePrompt ?? "",
  };
}

// ----------------------------------------------------- Content calendar ideas

export async function generateContentIdeas(count = 7): Promise<
  { topic: string; postType: string; platform: string; hook: string }[]
> {
  const system = `${BRAND_CONTEXT}
Tu proposes des idées de contenu concrètes et variées pour une semaine.
Réponds UNIQUEMENT avec un objet JSON: {"ideas":[{"topic":string,"postType":string,"platform":string,"hook":string}]}
postType parmi: EDUCATIONAL, SOCIAL_PROOF, PROMOTIONAL, FAQ, BEHIND_SCENES, POOL_SHOWCASE, TREND_JACKING.
platform parmi: INSTAGRAM, FACEBOOK, TIKTOK, LINKEDIN, WHATSAPP_STATUS.`;
  const raw = await ask(system, `Donne ${count} idées différentes, sans répétition de format.`, 4000);
  const parsed = extractJSON<{ ideas: { topic: string; postType: string; platform: string; hook: string }[] }>(raw);
  return parsed.ideas ?? [];
}
