import Container from "@/components/Container";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";

/**
 * Default loading UI for any (app) route. Shows the section's frame —
 * eyebrow, title, supporting blocks — so the layout doesn't jump when
 * real data arrives. Individual routes can override with their own
 * loading.tsx if they want a tailored skeleton.
 */
export default function AppLoading() {
  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="space-y-3 pt-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 md:h-16 w-3/4 max-w-xl" />
        <Skeleton className="h-4 w-2/3 max-w-md" />
      </header>

      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-7 surface-2 rounded-xl p-6 space-y-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-1/2" />
          <SkeletonLines count={4} />
        </div>
        <div className="md:col-span-5 space-y-4">
          <div className="surface-2 rounded-xl p-6 space-y-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-1/3" />
          </div>
          <div className="surface-2 rounded-xl p-6 space-y-3">
            <Skeleton className="h-3 w-20" />
            <SkeletonLines count={3} />
          </div>
        </div>
      </div>
    </Container>
  );
}
