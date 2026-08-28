import type { LeadStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { FUNNEL_STAGES, LEAD_STATUS_ORDER } from "./constants";

const DAY = 86_400_000;

/** Statuses that mean "this lead has been contacted at least once". */
const CONTACTED_OR_BEYOND: LeadStatus[] = [
  "CONTACTED", "RESPONDED", "MEETING_SCHEDULED", "ONBOARDING", "LISTED", "ACTIVE", "PAUSED", "LOST",
];
const RESPONDED_OR_BEYOND: LeadStatus[] = [
  "RESPONDED", "MEETING_SCHEDULED", "ONBOARDING", "LISTED", "ACTIVE", "PAUSED",
];
const LISTED_OR_BEYOND: LeadStatus[] = ["LISTED", "ACTIVE", "PAUSED"];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function getDashboardData() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const monthAgo = new Date(now.getTime() - 30 * DAY);
  const prevWeek = new Date(now.getTime() - 14 * DAY);
  const weekAhead = new Date(now.getTime() + 7 * DAY);

  const [
    totalLeads,
    leadsThisWeek,
    leadsPrevWeek,
    leadsThisMonth,
    statusGroups,
    sourceGroups,
    cityGroups,
    recentLeads,
    recentActivities,
    messagesThisWeek,
    inboundThisWeek,
    scheduledContent,
    followUpsDue,
    revenueLeads,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.lead.count({ where: { createdAt: { gte: prevWeek, lt: weekAgo } } }),
    prisma.lead.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["source"], _count: { _all: true } }),
    prisma.lead.groupBy({
      by: ["city"],
      _count: { _all: true },
      orderBy: { _count: { city: "desc" } },
      take: 6,
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, city: true, status: true, score: true, createdAt: true },
    }),
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { lead: { select: { id: true, name: true } } },
    }),
    prisma.message.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.message.count({ where: { createdAt: { gte: weekAgo }, direction: "INBOUND" } }),
    prisma.contentPost.count({
      where: { status: "SCHEDULED", scheduledAt: { gte: now, lte: weekAhead } },
    }),
    prisma.lead.findMany({
      where: { nextFollowUpAt: { lte: now }, status: { notIn: ["LOST", "ACTIVE"] } },
      orderBy: { nextFollowUpAt: "asc" },
      take: 6,
      select: { id: true, name: true, city: true, status: true, nextFollowUpAt: true },
    }),
    prisma.lead.findMany({
      where: { status: "ACTIVE" },
      select: { pricePerDay: true, pricePerHour: true },
    }),
  ]);

  const byStatus = Object.fromEntries(
    LEAD_STATUS_ORDER.map((s) => [s, statusGroups.find((g) => g.status === s)?._count._all ?? 0]),
  ) as Record<LeadStatus, number>;

  const countIn = (list: LeadStatus[]) => list.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);

  const contacted = countIn(CONTACTED_OR_BEYOND);
  const responded = countIn(RESPONDED_OR_BEYOND);
  const listed = countIn(LISTED_OR_BEYOND);
  const active = byStatus.ACTIVE ?? 0;

  const funnel = FUNNEL_STAGES.map((stage) => {
    const value =
      stage === "NEW"
        ? totalLeads
        : stage === "CONTACTED"
          ? contacted
          : stage === "RESPONDED"
            ? responded
            : stage === "LISTED"
              ? listed
              : active;
    return { stage, value };
  });

  // Daily lead counts over the last 30 days.
  const dailyRaw = await prisma.lead.findMany({
    where: { createdAt: { gte: monthAgo } },
    select: { createdAt: true },
  });
  const buckets = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = startOfDay(new Date(now.getTime() - i * DAY));
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const { createdAt } of dailyRaw) {
    const key = startOfDay(createdAt).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const leadsOverTime = [...buckets.entries()].map(([date, count]) => ({ date, count }));

  // Monthly recurring potential from active pools (conservative: 4 days / month).
  const monthlyPotential = revenueLeads.reduce(
    (sum, l) => sum + (l.pricePerDay ?? (l.pricePerHour ?? 0) * 6) * 4,
    0,
  );

  const weekDelta =
    leadsPrevWeek === 0 ? (leadsThisWeek > 0 ? 100 : 0) : ((leadsThisWeek - leadsPrevWeek) / leadsPrevWeek) * 100;

  return {
    totals: {
      totalLeads,
      leadsThisWeek,
      leadsThisMonth,
      weekDelta,
      contacted,
      responded,
      listed,
      active,
      responseRate: contacted ? (responded / contacted) * 100 : 0,
      conversionRate: totalLeads ? (active / totalLeads) * 100 : 0,
      messagesThisWeek,
      inboundThisWeek,
      scheduledContent,
      monthlyPotential,
      onboarding: (byStatus.MEETING_SCHEDULED ?? 0) + (byStatus.ONBOARDING ?? 0),
    },
    byStatus,
    funnel,
    leadsOverTime,
    topCities: cityGroups.map((c) => ({ city: c.city, count: c._count._all })),
    bySource: sourceGroups.map((s) => ({ source: s.source, count: s._count._all })),
    recentLeads,
    recentActivities,
    followUpsDue,
  };
}

export async function getAnalyticsData() {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * DAY);

  const [leads, messages, content, sourceGroups] = await Promise.all([
    prisma.lead.findMany({
      select: { city: true, status: true, source: true, score: true, createdAt: true },
    }),
    prisma.message.findMany({
      where: { createdAt: { gte: monthAgo } },
      select: { channel: true, direction: true, createdAt: true, aiGenerated: true },
    }),
    prisma.contentPost.findMany({
      where: { status: "PUBLISHED" },
      select: { platform: true, postType: true, likes: true, comments: true, shares: true },
    }),
    prisma.lead.groupBy({ by: ["source"], _count: { _all: true }, _avg: { score: true } }),
  ]);

  // Source performance: volume, conversion and average score per channel.
  const bySource = sourceGroups.map((g) => {
    const subset = leads.filter((l) => l.source === g.source);
    const converted = subset.filter((l) => LISTED_OR_BEYOND.includes(l.status)).length;
    const contacted = subset.filter((l) => CONTACTED_OR_BEYOND.includes(l.status)).length;
    const responded = subset.filter((l) => RESPONDED_OR_BEYOND.includes(l.status)).length;
    return {
      source: g.source,
      total: g._count._all,
      avgScore: Math.round(g._avg.score ?? 0),
      conversionRate: subset.length ? (converted / subset.length) * 100 : 0,
      responseRate: contacted ? (responded / contacted) * 100 : 0,
    };
  }).sort((a, b) => b.total - a.total);

  // Conversion by city (only cities with at least one lead).
  const cityMap = new Map<string, { total: number; converted: number }>();
  for (const l of leads) {
    const entry = cityMap.get(l.city) ?? { total: 0, converted: 0 };
    entry.total++;
    if (LISTED_OR_BEYOND.includes(l.status)) entry.converted++;
    cityMap.set(l.city, entry);
  }
  const byCity = [...cityMap.entries()]
    .map(([city, v]) => ({
      city,
      total: v.total,
      converted: v.converted,
      rate: v.total ? (v.converted / v.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Message performance by channel.
  const channelMap = new Map<string, { out: number; in: number; ai: number }>();
  for (const m of messages) {
    const entry = channelMap.get(m.channel) ?? { out: 0, in: 0, ai: 0 };
    if (m.direction === "OUTBOUND") entry.out++;
    else entry.in++;
    if (m.aiGenerated) entry.ai++;
    channelMap.set(m.channel, entry);
  }
  const byChannel = [...channelMap.entries()].map(([channel, v]) => ({
    channel,
    sent: v.out,
    received: v.in,
    aiGenerated: v.ai,
    replyRate: v.out ? (v.in / v.out) * 100 : 0,
  }));

  // Content engagement by platform.
  const platformMap = new Map<string, { posts: number; engagement: number }>();
  for (const c of content) {
    const entry = platformMap.get(c.platform) ?? { posts: 0, engagement: 0 };
    entry.posts++;
    entry.engagement += (c.likes ?? 0) + (c.comments ?? 0) + (c.shares ?? 0);
    platformMap.set(c.platform, entry);
  }
  const byPlatform = [...platformMap.entries()].map(([platform, v]) => ({
    platform,
    posts: v.posts,
    engagement: v.engagement,
    avgEngagement: v.posts ? Math.round(v.engagement / v.posts) : 0,
  }));

  return { bySource, byCity, byChannel, byPlatform, totalLeads: leads.length };
}
