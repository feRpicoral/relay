import { Skeleton } from "@/components/ui/skeleton";

const KPI_SLOTS = ["a", "b", "c", "d", "e", "f"];

export default function AnalyticsLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-border flex items-center justify-between border-b px-6 py-6 md:px-8">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="flex flex-col gap-4 p-6 md:p-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {KPI_SLOTS.map((slot) => (
            <Skeleton key={slot} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </div>
  );
}
