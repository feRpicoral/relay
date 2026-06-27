"use client";

import { useFormatter, useTranslations } from "next-intl";

interface Cell {
  weekday: number;
  hour: number;
  count: number;
}

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const HOUR_LABEL_STEP = 3;
const REFERENCE_SUNDAY = Date.UTC(2024, 0, 7);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function Heatmap({ cells, timezone }: { cells: Cell[]; timezone: string }) {
  const t = useTranslations("analytics");
  const format = useFormatter();
  const max = Math.max(1, ...cells.map((c) => c.count));
  const hasData = cells.some((c) => c.count > 0);

  const cellAt = (weekday: number, hour: number) =>
    cells.find((c) => c.weekday === weekday && c.hour === hour) ?? { weekday, hour, count: 0 };

  const weekdayLabel = (weekday: number) =>
    format.dateTime(new Date(REFERENCE_SUNDAY + weekday * MS_PER_DAY), { weekday: "short" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs">{timezone}</span>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {t("charts.heatmapLess")}
          <span className="flex gap-0.5">
            {[0, 30, 55, 80, 100].map((pct) => (
              <span
                key={pct}
                className="size-3 rounded-[3px]"
                style={{
                  background:
                    pct === 0
                      ? "var(--color-secondary)"
                      : `color-mix(in oklch, var(--color-primary) ${pct}%, var(--color-secondary))`,
                }}
              />
            ))}
          </span>
          {t("charts.heatmapMore")}
        </div>
      </div>
      <div className="relative min-w-[640px]">
        <div className="grid grid-cols-[40px_repeat(24,1fr)] gap-1">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-muted-foreground text-center text-[10px]">
              {h % HOUR_LABEL_STEP === 0 ? h : ""}
            </span>
          ))}
          {WEEKDAY_ORDER.map((weekday) => (
            <Row
              key={weekday}
              label={weekdayLabel(weekday)}
              cells={Array.from({ length: 24 }, (_, h) => cellAt(weekday, h))}
              max={max}
            />
          ))}
        </div>
        {hasData ? null : (
          <div className="bg-card/70 absolute inset-0 flex items-center justify-center rounded-lg backdrop-blur-[1px]">
            <span className="text-muted-foreground text-sm">{t("widgets.notEnoughVolume")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, cells, max }: { label: string; cells: Cell[]; max: number }) {
  return (
    <>
      <span className="text-muted-foreground self-center text-xs">{label}</span>
      {cells.map((c) => {
        const intensity = c.count / max;
        const background =
          intensity === 0
            ? "var(--color-secondary)"
            : `color-mix(in oklch, var(--color-primary) ${Math.round(intensity * 95)}%, var(--color-secondary))`;
        return (
          <div
            key={c.hour}
            className="aspect-square rounded-[3px]"
            style={{ background }}
            title={`${label} ${c.hour}h: ${c.count}`}
          />
        );
      })}
    </>
  );
}
