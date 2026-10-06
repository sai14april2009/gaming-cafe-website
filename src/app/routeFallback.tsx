// Suspense fallback shown while a lazily-loaded route chunk downloads.
export function PageFallback() {
  return (
    <div className="flex items-center justify-center py-32" role="status" aria-live="polite">
      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
