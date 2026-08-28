import { z } from "zod";
import { handleError, ok, requireUser, requireWriteAccess } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { csvToObjects, mapHeader } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { computeLeadScore } from "@/lib/scoring";
import { normalizePhone } from "@/lib/utils";
import { leadSourceEnum } from "@/lib/validators";

const importSchema = z.object({
  csv: z.string().min(1, "Fichier vide"),
  source: leadSourceEnum.default("GOOGLE_MAPS"),
  defaultCity: z.string().optional(),
  skipDuplicates: z.boolean().default(true),
});

/**
 * Bulk import from a CSV export (Google Maps scrapers, spreadsheets…).
 * Headers are auto-mapped; duplicates are matched on normalised phone, then email.
 */
export async function POST(request: Request) {
  try {
    const user = requireWriteAccess(await requireUser());
    const { csv, source, defaultCity, skipDuplicates } = importSchema.parse(await request.json());

    const rows = csvToObjects(csv);
    if (!rows.length) return ok({ imported: 0, skipped: 0, errors: ["Aucune ligne exploitable."] });

    const headerMap = new Map<string, string>();
    for (const header of Object.keys(rows[0])) {
      const field = mapHeader(header);
      if (field) headerMap.set(header, field);
    }
    if (!Array.from(headerMap.values()).includes("name")) {
      return ok({
        imported: 0,
        skipped: rows.length,
        errors: [
          `Colonne « nom » introuvable. Colonnes détectées : ${Object.keys(rows[0]).join(", ")}`,
        ],
      });
    }

    const existing = await prisma.lead.findMany({ select: { phone: true, email: true } });
    const seenPhones = new Set(existing.map((l) => l.phone).filter(Boolean) as string[]);
    const seenEmails = new Set(existing.map((l) => l.email?.toLowerCase()).filter(Boolean) as string[]);

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (const [index, row] of rows.entries()) {
      const mapped: Record<string, string> = {};
      for (const [header, field] of headerMap) {
        if (row[header]) mapped[field] = row[header];
      }

      const name = mapped.name?.trim();
      if (!name) {
        skipped++;
        continue;
      }

      const phone = normalizePhone(mapped.phone);
      const email = mapped.email?.trim().toLowerCase() || null;

      if (skipDuplicates && ((phone && seenPhones.has(phone)) || (email && seenEmails.has(email)))) {
        skipped++;
        continue;
      }

      const tags = mapped.tags
        ? mapped.tags.split(/[|,;]/).map((t) => t.trim().toLowerCase()).filter(Boolean)
        : [];
      const rating = mapped.rating ? Number(String(mapped.rating).replace(",", ".")) : null;
      const latitude = mapped.latitude ? Number(mapped.latitude) : null;
      const longitude = mapped.longitude ? Number(mapped.longitude) : null;
      const city = mapped.city?.trim() || defaultCity?.trim() || "Inconnue";

      const payload = {
        name,
        city,
        phone,
        whatsapp: phone,
        email,
        address: mapped.address ?? null,
        website: mapped.website ?? null,
        mapsUrl: mapped.mapsUrl ?? null,
        notes: mapped.notes ?? null,
        sourceQuery: mapped.sourceQuery ?? null,
        rating: rating !== null && Number.isFinite(rating) ? rating : null,
        latitude: latitude !== null && Number.isFinite(latitude) ? latitude : null,
        longitude: longitude !== null && Number.isFinite(longitude) ? longitude : null,
        tags,
        source,
      };

      try {
        const lead = await prisma.lead.create({
          data: { ...payload, score: computeLeadScore(payload) },
        });
        await logActivity({
          leadId: lead.id,
          userId: user.id,
          type: "IMPORT",
          title: `Importé depuis un CSV (${source})`,
        });
        if (phone) seenPhones.add(phone);
        if (email) seenEmails.add(email);
        imported++;
      } catch (err) {
        skipped++;
        if (errors.length < 5) {
          errors.push(`Ligne ${index + 2} (${name}) : ${err instanceof Error ? err.message : "erreur"}`);
        }
      }
    }

    return ok({ imported, skipped, errors });
  } catch (err) {
    return handleError(err);
  }
}
