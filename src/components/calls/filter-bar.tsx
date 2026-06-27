"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CALL_DIRECTION_VALUES,
  CALL_OUTCOME_VALUES,
  CALL_STATUS_VALUES,
  DATE_RANGE_VALUES,
  SENTIMENT_VALUES,
} from "@/lib/calls/filters";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 350;
const ALL = "all";

type FilterKey = "status" | "outcome" | "sentiment" | "direction" | "range";

const FILTER_KEYS: FilterKey[] = ["status", "outcome", "sentiment", "direction", "range"];

export function CallsFilterBar() {
  const t = useTranslations("calls.list");
  const tStatus = useTranslations("enums.callStatus");
  const tOutcome = useTranslations("enums.outcome");
  const tSentiment = useTranslations("enums.sentiment");
  const tDirection = useTranslations("enums.callDirection");
  const tRange = useTranslations("calls.list.dateRange");

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [search, setSearch] = useState(params.get("q") ?? "");
  const [mobileOpen, setMobileOpen] = useState(false);

  const enumLabels: Record<FilterKey, (value: string) => string> = {
    status: (v) => tStatus(v as never),
    outcome: (v) => tOutcome(v as never),
    sentiment: (v) => tSentiment(v as never),
    direction: (v) => tDirection(v as never),
    range: (v) => tRange(v as never),
  };

  const options: Record<FilterKey, readonly string[]> = {
    status: CALL_STATUS_VALUES,
    outcome: CALL_OUTCOME_VALUES,
    sentiment: SENTIMENT_VALUES,
    direction: CALL_DIRECTION_VALUES,
    range: DATE_RANGE_VALUES,
  };

  function pushParams(mutate: (usp: URLSearchParams) => void) {
    const usp = new URLSearchParams(params.toString());
    mutate(usp);
    usp.delete("page");
    const query = usp.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const initialQ = params.get("q") ?? "";
  useEffect(() => {
    if (search === initialQ) return;
    const id = setTimeout(() => {
      pushParams((usp) => {
        if (search) usp.set("q", search);
        else usp.delete("q");
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function setFilter(key: FilterKey, value: string) {
    pushParams((usp) => {
      if (value === ALL) usp.delete(key === "range" ? "range" : key);
      else usp.set(key === "range" ? "range" : key, value);
    });
  }

  function clearAll() {
    setSearch("");
    router.push(pathname);
  }

  const activeFilters = FILTER_KEYS.filter((key) => {
    const value = params.get(key);
    return value != null && value !== "" && value !== ALL;
  });
  const activeCount = activeFilters.length + (params.get("q") ? 1 : 0);

  function FilterSelect({ filterKey }: { filterKey: FilterKey }) {
    const current = params.get(filterKey) ?? ALL;
    return (
      <Select value={current} onValueChange={(v) => setFilter(filterKey, v)}>
        <SelectTrigger
          className={cn(
            "h-8 w-auto gap-1.5 text-xs",
            current !== ALL && "border-primary/40 bg-primary/5",
          )}
          aria-label={t(`filters.${filterKey === "range" ? "date" : filterKey}` as never)}
        >
          <span className="text-muted-foreground">
            {t(`filters.${filterKey === "range" ? "date" : filterKey}` as never)}
          </span>
          {current !== ALL ? (
            <SelectValue />
          ) : (
            <span className="sr-only">
              <SelectValue />
            </span>
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>
            {filterKey === "range" ? tRange("all") : t("filters.all")}
          </SelectItem>
          {options[filterKey]
            .filter((v) => v !== ALL)
            .map((value) => (
              <SelectItem key={value} value={value}>
                {enumLabels[filterKey](value)}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 md:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-9 pl-9"
            aria-label={t("searchPlaceholder")}
          />
        </div>

        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {FILTER_KEYS.map((key) => (
            <FilterSelect key={key} filterKey={key} />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
        >
          <SlidersHorizontal className="size-4" />
          {t("filters.mobileTrigger")}
          {activeCount > 0 ? (
            <Badge variant="default" className="ml-0.5 px-1.5 py-0">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </div>

      {mobileOpen ? (
        <div className="grid grid-cols-2 gap-2 md:hidden">
          {FILTER_KEYS.map((key) => (
            <FilterSelect key={key} filterKey={key} />
          ))}
        </div>
      ) : null}

      {activeCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {params.get("q") ? (
            <ActivePill
              label={`${t("searchPlaceholder").replace("…", "")}: ${params.get("q")}`}
              removeLabel={t("filters.remove")}
              onRemove={() => {
                setSearch("");
                pushParams((usp) => usp.delete("q"));
              }}
            />
          ) : null}
          {activeFilters.map((key) => {
            const value = params.get(key)!;
            const dim = t(`filters.${key === "range" ? "date" : key}` as never);
            return (
              <ActivePill
                key={key}
                label={`${dim}: ${enumLabels[key](value)}`}
                removeLabel={t("filters.remove")}
                onRemove={() => setFilter(key, ALL)}
              />
            );
          })}
          <button
            type="button"
            onClick={clearAll}
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
          >
            {t("filters.clear")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ActivePill({
  label,
  removeLabel,
  onRemove,
}: {
  label: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <span className="border-border bg-card inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
