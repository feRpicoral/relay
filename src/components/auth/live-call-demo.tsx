import { Bot, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Dot } from "@/components/ui/dot";
import { cn } from "@/lib/utils";

const WAVE_BARS = [
  19, 10, 19, 19, 22, 27, 23, 32, 31, 40, 30, 40, 42, 34, 39, 42, 39, 42, 37, 42, 39, 40, 38, 40,
  35, 31, 36, 32, 27, 30, 24, 15, 14, 9,
] as const;

interface LiveCallDemoProps {
  phone: string;
  elapsed: string;
  liveLabel: string;
  agentLabel: string;
  callerLabel: string;
  turns: { speaker: "agent" | "caller"; text: string }[];
  metrics: string[];
}

export function LiveCallDemo({
  phone,
  elapsed,
  liveLabel,
  agentLabel,
  callerLabel,
  turns,
  metrics,
}: LiveCallDemoProps) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-2xl">
      <div className="border-border flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[13px] font-semibold">{phone}</span>
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary gap-1.5">
            <Dot tone="primary" pulse />
            {liveLabel}
          </Badge>
        </div>
        <span className="text-muted-foreground font-mono text-[11px]">{elapsed}</span>
      </div>

      <div
        className="border-primary/20 mx-3 mt-3 mb-1.5 flex h-[60px] items-center justify-center gap-[3px] overflow-hidden rounded-md border px-2"
        aria-hidden
      >
        {WAVE_BARS.map((height, i) => (
          <span
            key={i}
            className="from-primary to-chart-5 animate-wave w-1 flex-none origin-center rounded-md bg-gradient-to-b"
            style={
              {
                height: `${height}px`,
                "--wave-duration": `${600 + (i % 6) * 70}ms`,
                "--wave-delay": `${(i * 53) % 760}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="flex flex-col gap-1.5 px-3 pt-1.5 pb-3">
        {turns.map((turn, i) => (
          <div key={i} className={cn("flex", turn.speaker === "caller" && "justify-end")}>
            <div
              className={cn(
                "max-w-[88%] rounded-xl border px-2.5 py-2",
                turn.speaker === "agent"
                  ? "border-primary/25 bg-primary/10"
                  : "border-border bg-secondary",
              )}
            >
              <div
                className={cn(
                  "mb-0.5 flex items-center gap-1 text-[10px] font-semibold",
                  turn.speaker === "agent" ? "text-primary" : "text-muted-foreground",
                )}
              >
                {turn.speaker === "agent" ? (
                  <Bot className="size-2.5" />
                ) : (
                  <User className="size-2.5" />
                )}
                {turn.speaker === "agent" ? agentLabel : callerLabel}
              </div>
              <p className="text-xs leading-relaxed">{turn.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-border flex flex-wrap gap-3 border-t px-3 py-2.5">
        {metrics.map((metric) => (
          <span
            key={metric}
            className="text-muted-foreground flex items-center gap-1.5 font-mono text-[10.5px]"
          >
            <Dot tone="success" className="size-[5px]" />
            {metric}
          </span>
        ))}
      </div>
    </div>
  );
}
