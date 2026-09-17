import AppLoadingSkeleton from "@/components/app/AppLoadingSkeleton";
import ThemeScope from "@/components/ui/ThemeScope";

/** Session loading stays in Nat, so the dark session never flashes light. */
export default function SessionLoading() {
  return (
    <ThemeScope theme="nat" className="minh-dvh">
      <AppLoadingSkeleton />
    </ThemeScope>
  );
}
