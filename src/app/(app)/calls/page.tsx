import { ChevronLeft, ChevronRight, PhoneCall } from "lucide-react";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { CallStatusBadge } from "@/components/call/call-status-badge";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { requireSession } from "@/lib/auth/session";
import { outcomeLabel } from "@/lib/calls/labels";
import { getDb } from "@/lib/db/with-org";
import { formatDuration, formatPhone } from "@/lib/utils";

const PAGE_SIZE = 50;

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireSession();
  const db = getDb(session.orgId);
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const t = await getTranslations("calls.list");
  const tDirection = await getTranslations("enums.callDirection");
  const tOutcome = await getTranslations("enums.outcome");
  const formatter = await getFormatter();
  void (await getLocale());

  // Aggregate count + page in parallel so pagination doesn't double the latency.
  const [total, calls] = await Promise.all([
    db.call.count(),
    db.call.findMany({
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { agent: { select: { name: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild variant="outline">
            <Link href="/live">
              <PhoneCall className="h-4 w-4" />
              {t("liveButton")}
            </Link>
          </Button>
        }
      />
      <div className="p-8">
        {calls.length === 0 ? (
          <Empty
            icon={<PhoneCall className="h-5 w-5" />}
            title={t("empty.title")}
            description={t("empty.description")}
          />
        ) : (
          <>
            <Card className="overflow-hidden">
              <div className="divide-border divide-y">
                {calls.map((call) => (
                  <Link
                    key={call.id}
                    href={`/calls/${call.id}`}
                    className="hover:bg-accent/40 flex items-center justify-between px-5 py-3 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <CallStatusBadge status={call.status} />
                      <div>
                        <p className="font-medium">
                          {call.direction === "INBOUND"
                            ? formatPhone(call.callerE164)
                            : formatPhone(call.calleeE164)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {call.agent?.name ?? "-"} , {tDirection(call.direction)} ,{" "}
                          {formatter.dateTime(call.startedAt, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {call.durationMs != null ? (
                        <p className="font-mono text-sm">{formatDuration(call.durationMs)}</p>
                      ) : null}
                      {call.outcome ? (
                        <p className="text-muted-foreground text-xs">
                          {outcomeLabel(call.outcome, tOutcome)}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                {t("paginationSummary", { page, totalPages, total })}
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" disabled={!hasPrev}>
                  <Link href={`/calls?page=${page - 1}`} aria-disabled={!hasPrev}>
                    <ChevronLeft className="h-4 w-4" />
                    {t("previous")}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" disabled={!hasNext}>
                  <Link href={`/calls?page=${page + 1}`} aria-disabled={!hasNext}>
                    {t("next")}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
