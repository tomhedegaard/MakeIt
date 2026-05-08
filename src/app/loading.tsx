/**
 * Root loading fallback — kicks in for full-route navigations while
 * server components stream. Keep it minimal: a centered pulse-dot so
 * the app feels alive, never a spinner.
 */
export default function RootLoading() {
  return (
    <main className="relative z-10 flex-1 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <span className="pulse-dot" />
        <span className="eyebrow">Loader</span>
      </div>
    </main>
  );
}
