import { Phone } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/lib/status-tone";

export interface BookingRow {
  id: string;
  callId: string;
  time: string;
  attendeeName: string;
  secondary: string | null;
  phone: string | null;
  statusLabel: string;
  statusTone: StatusTone;
}

export interface BookingDay {
  dayKey: string;
  header: string;
  rows: BookingRow[];
}

interface BookingListProps {
  days: BookingDay[];
  viewCallLabel: string;
}

export function BookingList({ days, viewCallLabel }: BookingListProps) {
  return (
    <div className="space-y-5">
      {days.map((day) => (
        <section key={day.dayKey}>
          <h2 className="text-muted-foreground mx-0.5 mb-2 text-xs font-semibold tracking-wide uppercase">
            {day.header}
          </h2>
          <Card className="divide-border/60 divide-y overflow-hidden">
            {day.rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3.5 px-4 py-3 sm:px-4">
                <div className="w-13 shrink-0 text-center">
                  <span className="font-mono text-[15px] font-semibold">{row.time}</span>
                </div>
                <div className="bg-border h-8 w-px shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{row.attendeeName}</p>
                  {row.secondary ? (
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">{row.secondary}</p>
                  ) : null}
                </div>
                {row.phone ? (
                  <span className="text-muted-foreground hidden font-mono text-xs md:inline">
                    {row.phone}
                  </span>
                ) : null}
                <StatusBadge label={row.statusLabel} tone={row.statusTone} />
                <Button asChild variant="ghost" size="sm" className="text-primary shrink-0">
                  <Link href={`/calls/${row.callId}`}>
                    <Phone className="size-3.5" />
                    <span className="hidden sm:inline">{viewCallLabel}</span>
                  </Link>
                </Button>
              </div>
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}
