import { Skeleton } from "@/components/ui/skeleton";

const CARD_COUNT = 6;

export default function CampaignsLoading() {
  return (
    <>
      <div className="border-border flex flex-col gap-1 border-b px-8 py-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-3.5 p-6 sm:grid-cols-2 md:p-8 lg:grid-cols-3">
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <div key={i} className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    </>
  );
}
