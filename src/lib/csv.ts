/** Minimal RFC-4180-ish CSV parser (handles quoted fields, embedded commas/newlines). */
export function parseCSV(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function csvToObjects(input: string): Record<string, string>[] {
  const rows = parseCSV(input);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (r[i] ?? "").trim()));
    return obj;
  });
}

export function toCSV(rows: Record<string, unknown>[], headers?: string[]): string {
  if (!rows.length) return "";
  const cols = headers ?? Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) ? v.join("|") : v instanceof Date ? v.toISOString() : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

/**
 * Maps loose CSV headers (Google Maps exports, scrapers, hand-made sheets)
 * onto our Lead fields.
 */
const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "nom", "title", "titre", "business", "business_name", "place", "établissement"],
  phone: ["phone", "telephone", "téléphone", "tel", "phone_number", "numero", "numéro"],
  whatsapp: ["whatsapp", "wa", "whatsapp_number"],
  email: ["email", "e-mail", "mail", "courriel"],
  address: ["address", "adresse", "full_address", "formatted_address", "street"],
  city: ["city", "ville", "locality", "commune"],
  website: ["website", "site", "site_web", "url", "web"],
  mapsUrl: ["maps_url", "mapsurl", "google_maps", "maps", "link", "google_url", "place_url"],
  rating: ["rating", "note", "stars", "score_google", "avis"],
  latitude: ["latitude", "lat"],
  longitude: ["longitude", "lng", "lon", "long"],
  notes: ["notes", "note", "remarks", "commentaire", "description"],
  tags: ["tags", "categories", "category", "type", "labels"],
  sourceQuery: ["query", "search_query", "sourcequery", "recherche", "keyword"],
};

export function mapHeader(header: string): string | null {
  const h = header.trim().toLowerCase().replace(/\s+/g, "_");
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(h)) return field;
  }
  return null;
}
