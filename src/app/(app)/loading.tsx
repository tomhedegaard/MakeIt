import AppLoadingSkeleton from "@/components/app/AppLoadingSkeleton";
import LoadingTheme from "@/components/app/LoadingTheme";

/**
 * Default loading UI for any (app) route. Individual routes can override
 * with their own loading.tsx if they want a tailored skeleton.
 */
export default function AppLoading() {
  return (
    <LoadingTheme>
      <AppLoadingSkeleton />
    </LoadingTheme>
  );
}
