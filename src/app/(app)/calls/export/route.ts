import type { NextRequest } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { callsToCsv } from "@/lib/calls/export";
import { parseCallFilters } from "@/lib/calls/filters";
import { loadCallsForExport } from "@/lib/calls/queries";

const EXPORT_LIMIT = 5000;

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const sp = request.nextUrl.searchParams;
  const filters = parseCallFilters({
    q: sp.get("q") ?? undefined,
    status: sp.get("status") ?? undefined,
    outcome: sp.get("outcome") ?? undefined,
    sentiment: sp.get("sentiment") ?? undefined,
    direction: sp.get("direction") ?? undefined,
    range: sp.get("range") ?? undefined,
  });

  const rows = await loadCallsForExport(session.orgId, filters, EXPORT_LIMIT);
  const csv = callsToCsv(rows);
  const filename = `calls-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
