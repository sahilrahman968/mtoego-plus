export default function StoreLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[92rem] px-4 py-12 sm:px-6 lg:px-8"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <span className="sr-only">Loading jewellery…</span>
      <div className="animate-pulse" aria-hidden="true">
        <div className="mb-5 h-3 w-24 rounded-full bg-primary/20" />
        <div className="mb-10 h-10 w-64 max-w-full rounded bg-foreground/10" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index}>
              <div className="aspect-[4/5] rounded bg-foreground/10" />
              <div className="mt-4 h-4 w-4/5 rounded bg-foreground/10" />
              <div className="mt-2 h-3 w-2/5 rounded bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
