import Link from "next/link";

import { CallStatusBadge } from "@/components/call/call-status-badge";
import { CallOutcomeBadge, SentimentInline } from "@/components/calls/badges";
import { DirectionIcon } from "@/components/calls/direction-icon";
import type { CallListRow } from "@/components/calls/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration } from "@/lib/utils";

const EMPTY_VALUE = "—";

export interface CallsTableRow extends CallListRow {
  startedLabel: string;
  directionLabel: string;
}

interface CallsTableProps {
  rows: CallsTableRow[];
  labels: {
    status: string;
    caller: string;
    agent: string;
    started: string;
    duration: string;
    sentiment: string;
    outcome: string;
  };
}

export function CallsTable({ rows, labels }: CallsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labels.status}</TableHead>
          <TableHead>{labels.caller}</TableHead>
          <TableHead>{labels.agent}</TableHead>
          <TableHead>{labels.started}</TableHead>
          <TableHead className="text-right">{labels.duration}</TableHead>
          <TableHead>{labels.sentiment}</TableHead>
          <TableHead>{labels.outcome}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="cursor-pointer">
            <TableCell>
              <Link href={`/calls/${row.id}`} className="contents">
                <CallStatusBadge status={row.status} />
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/calls/${row.id}`} className="flex items-center gap-2.5">
                <DirectionIcon direction={row.direction} label={row.directionLabel} />
                <span className="min-w-0">
                  <span className="text-foreground block font-mono text-sm font-semibold">
                    {row.peerPhone}
                  </span>
                  {row.callerName ? (
                    <span className="text-muted-foreground block truncate text-xs">
                      {row.callerName}
                    </span>
                  ) : null}
                </span>
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              <Link href={`/calls/${row.id}`} className="block">
                {row.agentName ?? EMPTY_VALUE}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs">
              <Link href={`/calls/${row.id}`} className="block">
                {row.startedLabel}
              </Link>
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              <Link href={`/calls/${row.id}`} className="block">
                {row.durationMs != null ? formatDuration(row.durationMs) : EMPTY_VALUE}
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/calls/${row.id}`} className="block">
                {row.sentiment ? (
                  <SentimentInline sentiment={row.sentiment} />
                ) : (
                  <span className="text-muted-foreground text-xs">{EMPTY_VALUE}</span>
                )}
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/calls/${row.id}`} className="contents">
                {row.outcome ? (
                  <CallOutcomeBadge outcome={row.outcome} />
                ) : (
                  <span className="text-muted-foreground text-xs">{EMPTY_VALUE}</span>
                )}
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
