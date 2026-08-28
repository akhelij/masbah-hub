import type { LeadStatus } from "@prisma/client";
import { LEAD_STATUS_LABEL } from "@/lib/constants";

export function Funnel({ stages }: { stages: { stage: LeadStatus; value: number }[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const prev = i === 0 ? null : stages[i - 1].value;
        const rate = prev ? (prev === 0 ? 0 : (s.value / prev) * 100) : null;
        return (
          <div key={s.stage}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-ink">{LEAD_STATUS_LABEL[s.stage]}</span>
              <span className="flex items-center gap-2 text-muted">
                {rate !== null && (
                  <span className="rounded bg-card-2 px-1.5 py-0.5 text-[10px] font-medium">
                    {rate.toFixed(0)}%
                  </span>
                )}
                <span className="font-semibold text-ink">{s.value}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-card-2">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max((s.value / max) * 100, s.value > 0 ? 3 : 0)}%`,
                  background: `linear-gradient(90deg,#1e40af ${100 - i * 14}%,#0d9488 100%)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
