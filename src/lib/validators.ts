import { z } from "zod";

const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), schema.nullable());

export const leadSourceEnum = z.enum([
  "GOOGLE_MAPS", "MANUAL", "REFERRAL", "FACEBOOK", "INSTAGRAM", "WHATSAPP", "WEBSITE", "ADS", "OTHER",
]);

export const leadStatusEnum = z.enum([
  "NEW", "CONTACTED", "RESPONDED", "MEETING_SCHEDULED", "ONBOARDING", "LISTED", "ACTIVE", "PAUSED", "LOST",
]);

export const channelEnum = z.enum(["WHATSAPP", "EMAIL", "INSTAGRAM", "FACEBOOK", "SMS", "OTHER"]);
export const directionEnum = z.enum(["INBOUND", "OUTBOUND"]);
export const languageEnum = z.enum(["FR", "AR", "EN"]);
export const platformEnum = z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "WHATSAPP_STATUS"]);
export const postTypeEnum = z.enum([
  "EDUCATIONAL", "SOCIAL_PROOF", "PROMOTIONAL", "FAQ", "BEHIND_SCENES", "POOL_SHOWCASE", "TREND_JACKING",
]);
export const contentStatusEnum = z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);

export const createLeadSchema = z.object({
  name: z.string().min(2, "Le nom est requis"),
  city: z.string().min(2, "La ville est requise"),
  phone: emptyToNull(z.string()).optional(),
  email: emptyToNull(z.string().email("Email invalide")).optional(),
  whatsapp: emptyToNull(z.string()).optional(),
  address: emptyToNull(z.string()).optional(),
  source: leadSourceEnum.default("MANUAL"),
  sourceQuery: emptyToNull(z.string()).optional(),
  status: leadStatusEnum.default("NEW"),
  rating: emptyToNull(z.coerce.number().min(0).max(5)).optional(),
  mapsUrl: emptyToNull(z.string()).optional(),
  website: emptyToNull(z.string()).optional(),
  latitude: emptyToNull(z.coerce.number()).optional(),
  longitude: emptyToNull(z.coerce.number()).optional(),
  notes: emptyToNull(z.string()).optional(),
  tags: z.array(z.string()).default([]),
  assignedToId: emptyToNull(z.string()).optional(),
  nextFollowUpAt: emptyToNull(z.coerce.date()).optional(),
  poolName: emptyToNull(z.string()).optional(),
  poolAddress: emptyToNull(z.string()).optional(),
  poolCity: emptyToNull(z.string()).optional(),
  pricePerHour: emptyToNull(z.coerce.number()).optional(),
  pricePerDay: emptyToNull(z.coerce.number()).optional(),
  capacity: emptyToNull(z.coerce.number().int()).optional(),
  amenities: z.array(z.string()).default([]),
  poolPhotos: z.array(z.string()).default([]),
});

export const updateLeadSchema = createLeadSchema.partial();

export const createMessageSchema = z.object({
  leadId: z.string().min(1),
  channel: channelEnum.default("WHATSAPP"),
  direction: directionEnum.default("OUTBOUND"),
  content: z.string().min(1, "Le message est vide"),
  language: languageEnum.default("FR"),
  templateId: emptyToNull(z.string()).optional(),
  aiGenerated: z.boolean().default(false),
  aiPrompt: emptyToNull(z.string()).optional(),
  markSent: z.boolean().default(true),
});

export const generateMessageSchema = z.object({
  leadId: z.string().min(1),
  tone: z.enum(["friendly", "professional", "urgent"]).default("friendly"),
  language: languageEnum.default("FR"),
  channel: channelEnum.default("WHATSAPP"),
  extraInstructions: emptyToNull(z.string()).optional(),
});

export const templateSchema = z.object({
  name: z.string().min(2),
  channel: channelEnum.default("WHATSAPP"),
  language: languageEnum.default("FR"),
  category: z
    .enum(["INITIAL_OUTREACH", "FOLLOW_UP_1", "FOLLOW_UP_2", "ONBOARDING", "RE_ENGAGEMENT", "CUSTOM"])
    .default("CUSTOM"),
  subject: emptyToNull(z.string()).optional(),
  body: z.string().min(5),
  isActive: z.boolean().default(true),
});

export const contentSchema = z.object({
  title: emptyToNull(z.string()).optional(),
  content: z.string().min(1),
  contentAr: emptyToNull(z.string()).optional(),
  hashtags: z.array(z.string()).default([]),
  platform: platformEnum.default("INSTAGRAM"),
  postType: postTypeEnum.default("EDUCATIONAL"),
  status: contentStatusEnum.default("DRAFT"),
  scheduledAt: emptyToNull(z.coerce.date()).optional(),
  publishedAt: emptyToNull(z.coerce.date()).optional(),
  imageUrl: emptyToNull(z.string()).optional(),
  imagePrompt: emptyToNull(z.string()).optional(),
  aiGenerated: z.boolean().default(false),
  aiPrompt: emptyToNull(z.string()).optional(),
  likes: emptyToNull(z.coerce.number().int()).optional(),
  comments: emptyToNull(z.coerce.number().int()).optional(),
  shares: emptyToNull(z.coerce.number().int()).optional(),
});

export const generateContentSchema = z.object({
  postType: postTypeEnum.default("EDUCATIONAL"),
  platform: platformEnum.default("INSTAGRAM"),
  topic: z.string().min(3, "Précisez un sujet"),
  language: z.enum(["FR", "AR", "BOTH"]).default("FR"),
  extraInstructions: emptyToNull(z.string()).optional(),
  save: z.boolean().default(false),
});

export const automationSchema = z.object({
  name: z.string().min(2),
  description: emptyToNull(z.string()).optional(),
  trigger: z.enum(["LEAD_CREATED", "LEAD_STATUS_CHANGED", "MESSAGE_RECEIVED", "LEAD_STALE"]),
  action: z.enum(["SEND_WEBHOOK", "CHANGE_STATUS", "ADD_TAG", "SCHEDULE_FOLLOW_UP", "NOTIFY"]),
  conditions: z.record(z.any()).nullable().optional(),
  actionConfig: z.record(z.any()).nullable().optional(),
  isActive: z.boolean().default(true),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
