import { Phone, PhoneCall } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { CallCard } from "@/components/calls/call-card";
import { CallsTable, type CallsTableRow } from "@/components/calls/calls-table";
import { ExportButton } from "@/components/calls/export-button";
import { CallsFilterBar } from "@/components/calls/filter-bar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { StateCard } from "@/components/ui/state-card";
import { requireSession } from "@/lib/auth/session";
import {
  type CallSearchParams,
  hasActiveFilters,
  parseCallFilters,
  searchParamsToQuery,
} from "@/lib/calls/filters";
import { loadCallsPage } from "@/lib/calls/queries";

const PAGE_SIZE = 25;
const SKELETON_ROWS = 8;

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<CallSearchParams>;
}) {
  const params = await searchParams;
  const t = await getTranslations("calls.list");
  const suspenseKey = searchParamsToQuery(params).toString();

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton />
            <Button asChild variant="outline" size="sm">
              <Link href="/live">
                <PhoneCall className="size-3.5" />
                {t("liveButton")}
              </Link>
            </Button>
          </div>
        }
      />
      <div className="flex flex-col gap-4 p-6 md:p-8">
        <CallsFilterBar />
        <Suspense key={suspenseKey} fallback={<CallsSkeleton />}>
          <CallsResults params={params} />
        </Suspense>
      </div>
    </>
  );
}

async function CallsResults({ params }: { params: CallSearchParams }) {
  const session = await requireSession();
  const t = await getTranslations("calls.list");
  const tDirection = await getTranslations("enums.callDirection");
  const formatter = await getFormatter();

  const filters = parseCallFilters(params);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const { items, total } = await loadCallsPage(session.orgId, filters, page, PAGE_SIZE);

  if (total === 0) {
    return hasActiveFilters(filters) ? (
      <StateCard
        bordered
        icon={<Phone />}
        title={t("noResults.title")}
        description={t("noResults.description")}
        actions={
          <Button asChild variant="outline">
            <Link href="/calls">{t("noResults.cta")}</Link>
          </Button>
        }
      />
    ) : (
      <StateCard
        bordered
        icon={<Phone />}
        title={t("empty.title")}
        description={t("empty.description")}
        actions={
          <Button asChild>
            <Link href="/settings/telephony">
              <Phone className="size-4" />
              {t("empty.cta")}
            </Link>
          </Button>
        }
      />
    );
  }

  const rows: CallsTableRow[] = items.map((item) => ({
    ...item,
    startedAt: item.startedAt.toISOString(),
    startedLabel: formatter.dateTime(item.startedAt, {
      dateStyle: "short",
      timeStyle: "short",
    }),
    directionLabel: tDirection(item.direction),
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  function hrefForPage(target: number): string {
    const usp = searchParamsToQuery(params);
    if (target <= 1) usp.delete("page");
    else usp.set("page", String(target));
    const query = usp.toString();
    return query ? `/calls?${query}` : "/calls";
  }

  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <CallsTable
          rows={rows}
          labels={{
            status: t("columns.status"),
            caller: t("columns.caller"),
            agent: t("columns.agent"),
            started: t("columns.started"),
            duration: t("columns.duration"),
            sentiment: t("columns.sentiment"),
            outcome: t("columns.outcome"),
          }}
        />
      </Card>

      <div className="flex flex-col gap-2.5 md:hidden">
        {rows.map((row) => (
          <CallCard key={row.id} row={row} />
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-muted-foreground text-sm">
          {t("paginationSummary", { from, to, total })}
        </p>
        {totalPages > 1 ? (
          <Pagination
            page={page}
            totalPages={totalPages}
            hrefForPage={hrefForPage}
            previousLabel={t("previous")}
            nextLabel={t("next")}
          />
        ) : null}
      </div>
    </>
  );
}

function CallsSkeleton() {
  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <div className="divide-border/60 divide-y">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-3 py-3.5">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </Card>
      <div className="flex flex-col gap-2.5 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </>
  );
}
