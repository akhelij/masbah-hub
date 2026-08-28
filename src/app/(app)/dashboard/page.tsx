import type { Metadata } from "next";
import {
  Activity as ActivityIcon,
  BellRing,
  CalendarClock,
  MessageCircle,
  PenTool,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { HorizontalBarChart, LeadsOverTimeChart, SourcePieChart } from "@/components/dashboard/charts";
import { Funnel } from "@/components/dashboard/funnel";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { getDashboardData } from "@/lib/analytics";
import { LEAD_SOURCE_LABEL, LEAD_STATUS_CLASS, LEAD_STATUS_LABEL } from "@/lib/constants";
import { cn, formatMAD, formatNumber, timeAgo } from "@/lib/utils";
import { scoreBand } from "@/lib/scoring";

export const metadata: Metadata = { title: "Tableau de bord" };
export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { href: "/leads?new=1", label: "Ajouter un prospect", icon: Plus },
  { href: "/messages", label: "Générer un message", icon: MessageCircle },
  { href: "/content?new=1", label: "Créer du contenu", icon: PenTool },
  { href: "/leads?import=1", label: "Importer un CSV", icon: Sparkles },
];

export default async function DashboardPage() {
  const d = await getDashboardData();
  const t = d.totals;

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de vos opérations Masbah.ma."
        actions={
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-card px-3 text-xs font-medium text-ink transition-colors hover:bg-card-2"
              >
                <Icon className="h-3.5 w-3.5 text-brand" />
                {label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Prospects au total"
          value={formatNumber(t.totalLeads)}
          delta={t.weekDelta}
          hint={`${t.leadsThisWeek} cette semaine`}
          icon={Users}
        />
        <StatCard
          label="Taux de réponse"
          value={`${t.responseRate.toFixed(0)}%`}
          hint={`${t.responded} réponses / ${t.contacted} contactés`}
          icon={TrendingUp}
          accent="teal"
        />
        <StatCard
          label="Piscines actives"
          value={formatNumber(t.active)}
          hint={`${t.listed} publiées · ${t.onboarding} en onboarding`}
          icon={ActivityIcon}
          accent="teal"
        />
        <StatCard
          label="Potentiel mensuel"
          value={formatMAD(t.monthlyPotential)}
          hint="Base 4 journées / piscine active"
          icon={Wallet}
          accent="sand"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Prospects acquis</CardTitle>
              <p className="mt-0.5 text-xs text-muted">30 derniers jours</p>
            </div>
            <Badge className="bg-brand-soft text-brand">{t.leadsThisMonth} ce mois</Badge>
          </CardHeader>
          <CardContent>
            <LeadsOverTimeChart data={d.leadsOverTime} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entonnoir de conversion</CardTitle>
            <Badge className="bg-teal-soft text-teal">{t.conversionRate.toFixed(1)}%</Badge>
          </CardHeader>
          <CardContent>
            <Funnel stages={d.funnel} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Sources de prospects</CardTitle>
          </CardHeader>
          <CardContent>
            <SourcePieChart
              data={d.bySource.map((s) => ({
                source: LEAD_SOURCE_LABEL[s.source] ?? s.source,
                count: s.count,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meilleures villes</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={d.topCities} dataKey="count" labelKey="city" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relances à faire</CardTitle>
            <Badge className="bg-sand/15 text-sand">{d.followUpsDue.length}</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {d.followUpsDue.length === 0 ? (
              <EmptyState
                icon={BellRing}
                title="Aucune relance en retard"
                description="Planifiez une relance depuis la fiche d'un prospect."
              />
            ) : (
              <ul className="divide-y divide-line">
                {d.followUpsDue.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/leads/${l.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-card-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-ink">{l.name}</p>
                        <p className="text-[11px] text-muted">{l.city}</p>
                      </div>
                      <span className="flex items-center gap-1 whitespace-nowrap text-[11px] text-danger">
                        <CalendarClock className="h-3 w-3" />
                        {timeAgo(l.nextFollowUpAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Derniers prospects</CardTitle>
            <Link href="/leads" className="text-xs font-medium text-brand hover:underline">
              Tout voir
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {d.recentLeads.length === 0 ? (
              <EmptyState icon={Users} title="Aucun prospect" description="Commencez par en ajouter un." />
            ) : (
              <ul className="divide-y divide-line">
                {d.recentLeads.map((l) => {
                  const band = scoreBand(l.score);
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/leads/${l.id}`}
                        className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-card-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-ink">{l.name}</p>
                          <p className="text-[11px] text-muted">
                            {l.city} · {timeAgo(l.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge className={band.className}>{l.score}</Badge>
                          <Badge className={LEAD_STATUS_CLASS[l.status]}>
                            {LEAD_STATUS_LABEL[l.status]}
                          </Badge>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <span className="text-xs text-muted">
              {t.messagesThisWeek} messages · {t.scheduledContent} posts planifiés
            </span>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {d.recentActivities.length === 0 ? (
              <EmptyState icon={ActivityIcon} title="Rien pour l'instant" />
            ) : (
              <ul className="max-h-[336px] divide-y divide-line overflow-y-auto">
                {d.recentActivities.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-2.5">
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        a.type === "MESSAGE_RECEIVED"
                          ? "bg-teal"
                          : a.type === "STATUS_CHANGE"
                            ? "bg-brand"
                            : "bg-muted/50",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-snug text-ink">{a.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        <Link href={`/leads/${a.lead.id}`} className="hover:text-brand hover:underline">
                          {a.lead.name}
                        </Link>{" "}
                        · {timeAgo(a.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
