import { Skeleton } from "@/components/ui/skeleton";

const CARD_COUNT = 6;

export default function AgentsLoading() {
  return (
    <>
      <div className="border-border flex flex-col gap-1 border-b px-8 py-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid gap-3.5 p-6 sm:grid-cols-2 md:p-8 lg:grid-cols-3">
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <div
            key={i}
            className="border-border bg-card flex flex-col overflow-hidden rounded-xl border"
          >
            <div className="flex items-start gap-3 p-4 pb-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </div>
            <div className="px-4 pb-3">
              <Skeleton className="h-3 w-7/12" />
            </div>
            <div className="border-border mt-auto border-t p-3">
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
