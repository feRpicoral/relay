import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROWS = 4;
const GRID_COLS = "md:grid-cols-[130px_minmax(0,1.6fr)_minmax(0,1fr)_130px_120px_auto]";

export default function LiveCallsLoading() {
  return (
    <>
      <div className="border-border flex flex-col gap-1 border-b px-8 py-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="space-y-4 p-8">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-7 w-28" />
        </div>
        <Card className="divide-border divide-y overflow-hidden">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div
              key={i}
              className={`grid grid-cols-1 gap-3 px-5 py-4 md:items-center md:gap-4 ${GRID_COLS}`}
            >
              <Skeleton className="h-6 w-24" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-6 w-16" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-24 md:justify-self-end" />
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
