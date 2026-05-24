import { Skeleton } from "@/components/ui/skeleton";

// Shown via React Suspense when navigating between (app) pages while the
// destination's RSC data loads. Sidebar links also swap their icon to a
// spinner via useLinkStatus, so this is the secondary indicator that covers
// card clicks, button-triggered router.push, and any nav surface without an
// inline pending state.
export default function AppLoading() {
  return (
    <>
      <div className="border-border flex flex-col gap-1 border-b px-8 py-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="space-y-4 p-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </>
  );
}
