"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { LEAD_SOURCE_LABEL } from "@/lib/constants";

type ImportResult = { imported: number; skipped: number; errors: string[] };

export function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [csv, setCsv] = useState("");
  const [source, setSource] = useState("GOOGLE_MAPS");
  const [defaultCity, setDefaultCity] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsv(await file.text());
  }

  async function submit() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/leads/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv, source, defaultCity, skipDuplicates }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.push(json.error ?? "Import échoué", "error");
      return;
    }
    setResult(json);
    toast.push(`${json.imported} prospects importés`);
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Importer des prospects"
      description="CSV depuis un scraper Google Maps ou un tableur. Les colonnes sont reconnues automatiquement."
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="import-source">Source à attribuer</Label>
            <Select id="import-source" value={source} onChange={(e) => setSource(e.target.value)}>
              {Object.entries(LEAD_SOURCE_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="import-city">Ville par défaut</Label>
            <Input
              id="import-city"
              value={defaultCity}
              onChange={(e) => setDefaultCity(e.target.value)}
              placeholder="Si la colonne ville est absente"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="import-file">Fichier CSV</Label>
          <input
            id="import-file"
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:opacity-90"
          />
        </div>

        <div>
          <Label htmlFor="import-csv">…ou collez le CSV directement</Label>
          <Textarea
            id="import-csv"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={7}
            className="font-mono text-[11px]"
            placeholder={"name,phone,city,rating,address\nVilla Palmier,0661234567,Casablanca,4.8,Californie"}
          />
          <p className="mt-1.5 text-[11px] text-muted">
            Colonnes reconnues : name/nom, phone/téléphone, whatsapp, email, address/adresse, city/ville,
            website, maps_url, rating/note, latitude, longitude, tags, notes, query.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#1e40af]"
          />
          Ignorer les doublons (même téléphone ou email)
        </label>

        {result && (
          <div className="rounded-lg border border-line bg-card-2 p-3 text-xs">
            <p className="font-medium text-ink">
              {result.imported} importés · {result.skipped} ignorés
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-danger">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={submit} loading={loading} disabled={!csv.trim()}>
            <Upload className="h-4 w-4" />
            Importer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
