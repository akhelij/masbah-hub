import type { LeadStatus, LeadSource, Channel, Platform, PostType, ContentStatus } from "@prisma/client";

export const APP_NAME = process.env.APP_NAME ?? "Masbah.ma";

/** Pipeline order — drives the Kanban board and the conversion funnel. */
export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "RESPONDED",
  "MEETING_SCHEDULED",
  "ONBOARDING",
  "LISTED",
  "ACTIVE",
  "PAUSED",
  "LOST",
];

export const FUNNEL_STAGES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "RESPONDED",
  "LISTED",
  "ACTIVE",
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "Nouveau",
  CONTACTED: "Contacté",
  RESPONDED: "A répondu",
  MEETING_SCHEDULED: "RDV planifié",
  ONBOARDING: "Onboarding",
  LISTED: "Publié",
  ACTIVE: "Actif",
  PAUSED: "En pause",
  LOST: "Perdu",
};

export const LEAD_STATUS_CLASS: Record<LeadStatus, string> = {
  NEW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  CONTACTED: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  RESPONDED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  MEETING_SCHEDULED: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  ONBOARDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  LISTED: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  PAUSED: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  LOST: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  GOOGLE_MAPS: "Google Maps",
  MANUAL: "Manuel",
  REFERRAL: "Recommandation",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp",
  WEBSITE: "Site web",
  ADS: "Publicité",
  OTHER: "Autre",
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  SMS: "SMS",
  OTHER: "Autre",
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  LINKEDIN: "LinkedIn",
  WHATSAPP_STATUS: "Statut WhatsApp",
};

export const POST_TYPE_LABEL: Record<PostType, string> = {
  EDUCATIONAL: "Éducatif",
  SOCIAL_PROOF: "Preuve sociale",
  PROMOTIONAL: "Promotionnel",
  FAQ: "FAQ",
  BEHIND_SCENES: "Coulisses",
  POOL_SHOWCASE: "Vitrine piscine",
  TREND_JACKING: "Tendance",
};

export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  DRAFT: "Brouillon",
  SCHEDULED: "Planifié",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
};

export const CONTENT_STATUS_CLASS: Record<ContentStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  PUBLISHED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  ARCHIVED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

/** Target cities — used for scoring, filters and seed data. */
export const TARGET_CITIES = [
  "Casablanca",
  "Marrakech",
  "Rabat",
  "Tanger",
  "Agadir",
  "Fès",
  "Bouskoura",
  "Dar Bouazza",
  "Mohammedia",
  "Essaouira",
  "Témara",
  "El Jadida",
];

/** Cities where demand is strongest — weighted higher in lead scoring. */
export const PRIORITY_CITIES = ["Casablanca", "Marrakech", "Rabat", "Dar Bouazza", "Bouskoura"];

export const COMMON_AMENITIES = [
  "jacuzzi",
  "bbq",
  "parking",
  "wifi",
  "chauffage",
  "vestiaire",
  "transat",
  "cuisine",
  "sonorisation",
  "gardien",
];

export const TONES = [
  { value: "friendly", label: "Amical" },
  { value: "professional", label: "Professionnel" },
  { value: "urgent", label: "Urgent" },
] as const;
