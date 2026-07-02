import { Skeleton } from "@/components/ui/skeleton";

const KPI_SLOTS = ["a", "b", "c", "d"];

export default function AppLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-border flex items-center justify-between border-b px-6 py-4 md:px-8 md:py-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="space-y-4 p-6 md:p-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {KPI_SLOTS.map((slot) => (
            <Skeleton key={slot} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
