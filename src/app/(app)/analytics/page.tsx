import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { HorizontalBarChart } from "@/components/dashboard/charts";
import { PageHeader } from "@/components/layout/page-header";
import { getAnalyticsData } from "@/lib/analytics";
import { CHANNEL_LABEL, LEAD_SOURCE_LABEL, PLATFORM_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

function rateClass(rate: number) {
  if (rate >= 40) return "bg-teal-soft text-teal";
  if (rate >= 15) return "bg-sand/15 text-sand";
  return "bg-card-2 text-muted";
}

export default async function AnalyticsPage() {
  const d = await getAnalyticsData();

  if (d.totalLeads === 0) {
    return (
      <>
        <PageHeader title="Analytics" description="Ce qui marche, et ce qui ne marche pas." />
        <Card>
          <EmptyState
            icon={BarChart3}
            title="Pas encore de données"
            description="Ajoutez des prospects et envoyez des messages pour voir apparaître les performances."
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Performance par source, ville, canal et plateforme."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Performance par source</CardTitle>
              <p className="mt-0.5 text-xs text-muted">
                Quel canal d&apos;acquisition amène les meilleurs prospects.
              </p>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-y border-line text-left text-[10px] uppercase text-muted">
                  <tr>
                    <th className="px-5 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Volume</th>
                    <th className="px-3 py-2 font-medium">Score moy.</th>
                    <th className="px-3 py-2 font-medium">Réponse</th>
                    <th className="px-3 py-2 font-medium">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {d.bySource.map((s) => (
                    <tr key={s.source}>
                      <td className="px-5 py-2.5 font-medium text-ink">
                        {LEAD_SOURCE_LABEL[s.source] ?? s.source}
                      </td>
                      <td className="px-3 py-2.5 text-muted">{s.total}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "inline-block rounded px-1.5 py-0.5 font-medium",
                            s.avgScore >= 70
                              ? "bg-teal-soft text-teal"
                              : s.avgScore >= 45
                                ? "bg-sand/15 text-sand"
                                : "bg-card-2 text-muted",
                          )}
                        >
                          {s.avgScore}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted">{s.responseRate.toFixed(0)}%</td>
                      <td className="px-3 py-2.5">
                        <Badge className={rateClass(s.conversionRate)}>
                          {s.conversionRate.toFixed(0)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volume par source</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart
              data={d.bySource.map((s) => ({
                label: LEAD_SOURCE_LABEL[s.source] ?? s.source,
                total: s.total,
              }))}
              dataKey="total"
              labelKey="label"
              color="#2563eb"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Conversion par ville</CardTitle>
              <p className="mt-0.5 text-xs text-muted">Prospects devenus piscines publiées.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {d.byCity.map((c) => (
              <div key={c.city}>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-medium text-ink">{c.city}</span>
                  <span className="text-muted">
                    {c.converted}/{c.total} · {c.rate.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-card-2">
                  <div
                    className="h-full rounded-full bg-teal transition-all"
                    style={{ width: `${Math.max(c.rate, c.converted > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Performance des messages</CardTitle>
              <p className="mt-0.5 text-xs text-muted">30 derniers jours.</p>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {d.byChannel.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-muted">Aucun message envoyé.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="border-y border-line text-left text-[10px] uppercase text-muted">
                  <tr>
                    <th className="px-5 py-2 font-medium">Canal</th>
                    <th className="px-3 py-2 font-medium">Envoyés</th>
                    <th className="px-3 py-2 font-medium">Reçus</th>
                    <th className="px-3 py-2 font-medium">Générés IA</th>
                    <th className="px-3 py-2 font-medium">Taux réponse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {d.byChannel.map((c) => (
                    <tr key={c.channel}>
                      <td className="px-5 py-2.5 font-medium text-ink">
                        {CHANNEL_LABEL[c.channel as keyof typeof CHANNEL_LABEL] ?? c.channel}
                      </td>
                      <td className="px-3 py-2.5 text-muted">{c.sent}</td>
                      <td className="px-3 py-2.5 text-muted">{c.received}</td>
                      <td className="px-3 py-2.5 text-muted">{c.aiGenerated}</td>
                      <td className="px-3 py-2.5">
                        <Badge className={rateClass(c.replyRate)}>{c.replyRate.toFixed(0)}%</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Performance du contenu</CardTitle>
              <p className="mt-0.5 text-xs text-muted">
                Engagement saisi manuellement après publication.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {d.byPlatform.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted">
                Aucun post publié. Passez un post au statut « Publié » et renseignez l&apos;engagement.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {d.byPlatform.map((p) => (
                  <div key={p.platform} className="rounded-lg border border-line p-3.5">
                    <p className="text-xs font-medium text-ink">
                      {PLATFORM_LABEL[p.platform as keyof typeof PLATFORM_LABEL] ?? p.platform}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-ink">{p.avgEngagement}</p>
                    <p className="text-[11px] text-muted">
                      engagement moyen · {p.posts} post(s) · {p.engagement} au total
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
