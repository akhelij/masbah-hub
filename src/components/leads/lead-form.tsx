"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { COMMON_AMENITIES, LEAD_SOURCE_LABEL, LEAD_STATUS_LABEL, TARGET_CITIES } from "@/lib/constants";

export type LeadFormValues = Record<string, unknown> & { id?: string };

export function LeadForm({
  initial,
  users,
  onDone,
}: {
  initial?: LeadFormValues;
  users: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [showPool, setShowPool] = useState(Boolean(initial?.poolName));

  const isEdit = Boolean(initial?.id);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(fd.entries());
    payload.tags = String(fd.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    payload.amenities = fd.getAll("amenities").map(String);

    const res = await fetch(isEdit ? `/api/leads/${initial!.id}` : "/api/leads", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setErrors(json.details ?? {});
      toast.push(json.error ?? "Échec de l'enregistrement", "error");
      return;
    }

    toast.push(isEdit ? "Prospect mis à jour" : "Prospect créé");
    onDone?.();
    router.refresh();
    if (!isEdit) router.push(`/leads/${json.id}`);
  }

  const v = (key: string, fallback = "") => String(initial?.[key] ?? fallback);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Nom du prospect *</Label>
          <Input id="name" name="name" required defaultValue={v("name")} placeholder="Villa Palmier — Ahmed Tazi" />
          <FieldError>{errors.name?.[0]}</FieldError>
        </div>

        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" name="phone" defaultValue={v("phone")} placeholder="0661234567" />
        </div>
        <div>
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input id="whatsapp" name="whatsapp" defaultValue={v("whatsapp")} placeholder="0661234567" />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={v("email")} />
          <FieldError>{errors.email?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="city">Ville *</Label>
          <Input id="city" name="city" required list="cities" defaultValue={v("city")} placeholder="Casablanca" />
          <datalist id="cities">
            {TARGET_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <FieldError>{errors.city?.[0]}</FieldError>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="address">Adresse</Label>
          <Input id="address" name="address" defaultValue={v("address")} />
        </div>

        <div>
          <Label htmlFor="source">Source</Label>
          <Select id="source" name="source" defaultValue={v("source", "MANUAL")}>
            {Object.entries(LEAD_SOURCE_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Statut</Label>
          <Select id="status" name="status" defaultValue={v("status", "NEW")}>
            {Object.entries(LEAD_STATUS_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="rating">Note Google (0-5)</Label>
          <Input id="rating" name="rating" type="number" step="0.1" min="0" max="5" defaultValue={v("rating")} />
        </div>
        <div>
          <Label htmlFor="assignedToId">Assigné à</Label>
          <Select id="assignedToId" name="assignedToId" defaultValue={v("assignedToId")}>
            <option value="">Non assigné</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="website">Site web</Label>
          <Input id="website" name="website" defaultValue={v("website")} />
        </div>
        <div>
          <Label htmlFor="mapsUrl">Lien Google Maps</Label>
          <Input id="mapsUrl" name="mapsUrl" defaultValue={v("mapsUrl")} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
          <Input
            id="tags"
            name="tags"
            defaultValue={Array.isArray(initial?.tags) ? (initial!.tags as string[]).join(", ") : ""}
            placeholder="has-pool, villa, premium"
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" defaultValue={v("notes")} rows={3} />
        </div>

        <div>
          <Label htmlFor="nextFollowUpAt">Prochaine relance</Label>
          <Input
            id="nextFollowUpAt"
            name="nextFollowUpAt"
            type="date"
            defaultValue={
              initial?.nextFollowUpAt ? String(initial.nextFollowUpAt).slice(0, 10) : ""
            }
          />
        </div>
      </div>

      <div className="rounded-lg border border-line">
        <button
          type="button"
          onClick={() => setShowPool((s) => !s)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium text-ink"
        >
          Détails de la piscine (après inscription)
          <span className="text-muted">{showPool ? "−" : "+"}</span>
        </button>
        {showPool && (
          <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="poolName">Nom de la piscine</Label>
              <Input id="poolName" name="poolName" defaultValue={v("poolName")} />
            </div>
            <div>
              <Label htmlFor="pricePerHour">Prix / heure (MAD)</Label>
              <Input id="pricePerHour" name="pricePerHour" type="number" defaultValue={v("pricePerHour")} />
            </div>
            <div>
              <Label htmlFor="pricePerDay">Prix / journée (MAD)</Label>
              <Input id="pricePerDay" name="pricePerDay" type="number" defaultValue={v("pricePerDay")} />
            </div>
            <div>
              <Label htmlFor="capacity">Capacité (personnes)</Label>
              <Input id="capacity" name="capacity" type="number" defaultValue={v("capacity")} />
            </div>
            <div className="sm:col-span-2">
              <Label>Équipements</Label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_AMENITIES.map((a) => (
                  <label
                    key={a}
                    className="cursor-pointer rounded-full border border-line px-2.5 py-1 text-[11px] text-muted transition-colors has-[:checked]:border-teal has-[:checked]:bg-teal-soft has-[:checked]:text-teal"
                  >
                    <input
                      type="checkbox"
                      name="amenities"
                      value={a}
                      defaultChecked={(initial?.amenities as string[])?.includes(a)}
                      className="sr-only"
                    />
                    {a}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onDone && (
          <Button type="button" variant="outline" onClick={onDone}>
            Annuler
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {isEdit ? "Enregistrer" : "Créer le prospect"}
        </Button>
      </div>
    </form>
  );
}
