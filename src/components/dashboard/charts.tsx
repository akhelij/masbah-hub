"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const CHART_COLORS = [
  "#2563eb",
  "#0d9488",
  "#d4a574",
  "#7c3aed",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#ec4899",
];

const axisProps = {
  stroke: "currentColor",
  tick: { fontSize: 11, fill: "currentColor" },
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    fontSize: 12,
    color: "var(--ink)",
  },
  labelStyle: { color: "var(--muted)", fontSize: 11 },
} as const;

export function LeadsOverTimeChart({ data }: { data: { date: string; count: number }[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
  }));

  // allowDecimals={false} forces integer ticks, so a fixed tickCount of 5 would
  // stretch a max of 1 up to a 0-4 axis and flatten the series against the floor.
  const max = Math.max(...formatted.map((d) => d.count), 1);
  const tickCount = Math.min(5, max + 1);

  return (
    <div className="h-64 w-full text-muted">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...axisProps} allowDecimals={false} width={36} tickCount={tickCount} domain={[0, max]} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v}`, "Prospects"]} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#leadGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SourcePieChart({ data }: { data: { source: string; count: number }[] }) {
  if (!data.length) return <EmptyChart />;
  return (
    <div className="h-64 w-full text-muted">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="source"
            innerRadius="52%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="var(--card)"
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 11, color: "var(--muted)" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HorizontalBarChart({
  data,
  dataKey,
  labelKey,
  color = "#0d9488",
  unit = "",
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  labelKey: string;
  color?: string;
  unit?: string;
}) {
  if (!data.length) return <EmptyChart />;
  return (
    <div className="h-64 w-full text-muted">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
          <XAxis type="number" {...axisProps} allowDecimals={false} />
          <YAxis type="category" dataKey={labelKey} {...axisProps} width={96} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v}${unit}`, ""]} cursor={{ fill: "var(--card-2)" }} />
          <Bar dataKey={dataKey} fill={color} radius={[0, 5, 5, 0]} maxBarSize={22} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-64 items-center justify-center text-xs text-muted">
      Pas encore de données.
    </div>
  );
}
