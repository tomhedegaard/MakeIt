import Container from "@/components/Container";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";

/** Inbox skeleton: title, queue rows on the left, case panel from lg (same grid as page.tsx). */
export default function CoachInboxLoading() {
  return (
    <Container size="wide" className="py-6 lg:py-12 space-y-8">
      <header className="pt-2 space-y-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </header>

      <div className="surface-2 lg:grid lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className="lg:border-r hairline">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-5 border-b hairline space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
        <div className="hidden lg:block p-8 space-y-6">
          <Skeleton className="h-6 w-1/2" />
          <SkeletonLines count={4} />
          <Skeleton className="h-11 w-40" />
        </div>
      </div>
    </Container>
  );
}
