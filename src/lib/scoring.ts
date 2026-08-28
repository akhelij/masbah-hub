import { PRIORITY_CITIES, TARGET_CITIES } from "./constants";

export type ScorableLead = {
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  city?: string | null;
  rating?: number | null;
  address?: string | null;
  tags?: string[];
  latitude?: number | null;
};

/**
 * 0-100 priority score. Reachability is weighted highest — a lead you cannot
 * contact is worthless no matter how good the pool looks.
 */
export function computeLeadScore(lead: ScorableLead): number {
  let score = 0;

  if (lead.whatsapp) score += 25;
  else if (lead.phone) score += 20;
  if (lead.email) score += 10;
  if (lead.website) score += 8;
  if (lead.address) score += 5;
  if (lead.latitude !== null && lead.latitude !== undefined) score += 4;

  const city = (lead.city ?? "").trim();
  if (PRIORITY_CITIES.some((c) => c.toLowerCase() === city.toLowerCase())) score += 20;
  else if (TARGET_CITIES.some((c) => c.toLowerCase() === city.toLowerCase())) score += 12;

  if (typeof lead.rating === "number") {
    if (lead.rating >= 4.5) score += 15;
    else if (lead.rating >= 4) score += 11;
    else if (lead.rating >= 3) score += 6;
  }

  const tags = (lead.tags ?? []).map((t) => t.toLowerCase());
  if (tags.includes("has-pool") || tags.includes("piscine")) score += 10;
  if (tags.includes("villa") || tags.includes("riad")) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreBand(score: number): { label: string; className: string } {
  if (score >= 70)
    return { label: "Chaud", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" };
  if (score >= 45)
    return { label: "Tiède", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };
  return { label: "Froid", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" };
}
