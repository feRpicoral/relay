"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Bucket {
  label: string;
  lo: number;
  count: number;
}

export function LatencyHistogramChart({ data }: { data: Bucket[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={30}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in oklch, var(--color-primary) 12%, transparent)" }}
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell
                key={d.label}
                fill={
                  d.lo >= 1000
                    ? "var(--color-destructive)"
                    : d.lo >= 800
                      ? "var(--color-warning)"
                      : "var(--color-primary)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
