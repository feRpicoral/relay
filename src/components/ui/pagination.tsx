import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PAGE_GAP, paginationRange } from "@/lib/pagination";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  previousLabel: string;
  nextLabel: string;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  hrefForPage,
  previousLabel,
  nextLabel,
  className,
}: PaginationProps) {
  const items = paginationRange(page, totalPages);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav className={cn("flex items-center gap-1.5", className)} aria-label="Pagination">
      <Button asChild variant="outline" size="icon-sm" disabled={!hasPrev} aria-disabled={!hasPrev}>
        <Link href={hrefForPage(page - 1)} aria-label={previousLabel}>
          <ChevronLeft />
        </Link>
      </Button>
      {items.map((item, i) =>
        item === PAGE_GAP ? (
          <span key={`gap-${i}`} className="text-muted-foreground px-1 text-sm">
            …
          </span>
        ) : (
          <Button key={item} asChild variant={item === page ? "default" : "outline"} size="icon-sm">
            <Link href={hrefForPage(item)} aria-current={item === page ? "page" : undefined}>
              {item}
            </Link>
          </Button>
        ),
      )}
      <Button asChild variant="outline" size="icon-sm" disabled={!hasNext} aria-disabled={!hasNext}>
        <Link href={hrefForPage(page + 1)} aria-label={nextLabel}>
          <ChevronRight />
        </Link>
      </Button>
    </nav>
  );
}
