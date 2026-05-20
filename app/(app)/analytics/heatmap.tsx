interface Cell {
  weekday: number;
  hour: number;
  count: number;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function Heatmap({ cells }: { cells: Cell[] }) {
  const max = Math.max(1, ...cells.map((c) => c.count));
  const grid: Cell[][] = Array.from({ length: 7 }, (_, wd) =>
    Array.from({ length: 24 }, (_, h) => {
      return (
        cells.find((c) => c.weekday === wd && c.hour === h) ?? { weekday: wd, hour: h, count: 0 }
      );
    }),
  );

  return (
    <div className="min-w-[640px]">
      <div className="grid grid-cols-[40px_repeat(24,1fr)] gap-1">
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-muted-foreground text-center text-[10px]">
            {h % 4 === 0 ? `${h}h` : ""}
          </span>
        ))}
        {grid.map((row, wd) => (
          <Row key={wd} weekday={wd} cells={row} max={max} />
        ))}
      </div>
    </div>
  );
}

function Row({ weekday, cells, max }: { weekday: number; cells: Cell[]; max: number }) {
  return (
    <>
      <span className="text-muted-foreground self-center text-xs">{WEEKDAYS[weekday]}</span>
      {cells.map((c) => {
        const intensity = c.count / max;
        const bg =
          intensity === 0
            ? "transparent"
            : `color-mix(in oklch, var(--color-primary) ${Math.round(intensity * 80)}%, transparent)`;
        return (
          <div
            key={c.hour}
            className="border-border aspect-square rounded border"
            style={{ background: bg }}
            title={`${WEEKDAYS[c.weekday]} ${c.hour}h: ${c.count} chamadas`}
          />
        );
      })}
    </>
  );
}
