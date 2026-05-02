type SkeletonLineProps = {
  className?: string;
};

function SkeletonLine({ className = "" }: SkeletonLineProps) {
  return <div className={`animate-pulse-slow rounded bg-card-hover ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="group relative overflow-hidden bg-transparent">
      <div className="relative aspect-[1/1.02] overflow-hidden border border-border bg-card/75">
        <div className="absolute inset-0 animate-pulse-slow bg-card-hover/80" />
        <div className="absolute left-2 top-2 z-10 h-5 w-20 animate-pulse-slow bg-card-hover" />
        <div className="absolute right-2 top-2 z-10 h-5 w-12 animate-pulse-slow border border-border bg-card-hover/80" />
      </div>
      <div className="pt-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="h-5 w-11/12" />
          </div>
          <div className="w-20 shrink-0 space-y-2 text-right">
            <SkeletonLine className="ml-auto h-5 w-16" />
            <SkeletonLine className="ml-auto h-3 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="relative aspect-[4/5] overflow-hidden border border-border bg-card/75">
      <div className="absolute inset-0 animate-pulse-slow bg-card-hover/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <SkeletonLine className="h-3 w-24" />
        <SkeletonLine className="mt-2 h-8 w-4/5" />
      </div>
    </div>
  );
}

export function WishlistCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/75">
      <div className="aspect-square animate-pulse-slow bg-card-hover/80" />
      <div className="space-y-3 p-3 sm:p-4">
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-5 w-2/5" />
        <div className="mt-3 flex gap-2">
          <SkeletonLine className="h-9 flex-1" />
          <SkeletonLine className="h-9 w-9" />
        </div>
      </div>
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="flex gap-4 rounded-xl border border-border bg-card/75 p-4">
      <div className="h-20 w-20 shrink-0 animate-pulse-slow rounded-lg bg-card-hover sm:h-24 sm:w-24" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-4 w-3/4" />
        <SkeletonLine className="h-3 w-1/2" />
        <SkeletonLine className="h-5 w-1/4" />
        <div className="pt-1">
          <SkeletonLine className="h-8 w-28" />
        </div>
      </div>
      <div className="hidden w-20 shrink-0 sm:block">
        <SkeletonLine className="ml-auto h-5 w-16" />
      </div>
    </div>
  );
}

export function OrderListCardSkeleton() {
  return (
    <div className="border border-border bg-card/75 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <SkeletonLine className="h-5 w-28" />
            <SkeletonLine className="h-5 w-16" />
          </div>
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-3 w-40" />
        </div>
        <div className="space-y-2">
          <SkeletonLine className="h-6 w-20" />
        </div>
      </div>
    </div>
  );
}

export function OrderDetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b border-border/60 pb-5">
        <SkeletonLine className="h-10 w-56" />
        <SkeletonLine className="h-4 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="border border-border bg-card/75 p-6">
            <SkeletonLine className="h-4 w-40" />
            <div className="mt-4 space-y-4">
              <SkeletonLine className="h-4 w-full" />
              <SkeletonLine className="h-4 w-11/12" />
              <SkeletonLine className="h-4 w-10/12" />
            </div>
          </div>
          <div className="border border-border bg-card/75 p-6">
            <SkeletonLine className="h-4 w-32" />
            <div className="mt-4 space-y-4">
              {[1, 2].map((item) => (
                <div key={item} className="flex gap-4">
                  <div className="h-16 w-16 shrink-0 animate-pulse-slow bg-card-hover" />
                  <div className="flex-1 space-y-2">
                    <SkeletonLine className="h-4 w-4/5" />
                    <SkeletonLine className="h-3 w-3/5" />
                    <SkeletonLine className="h-3 w-1/3" />
                  </div>
                  <SkeletonLine className="h-4 w-16 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="border border-border bg-card/85 p-6">
          <SkeletonLine className="h-4 w-36" />
          <div className="mt-4 space-y-3">
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-11/12" />
            <SkeletonLine className="h-3 w-10/12" />
            <SkeletonLine className="h-px w-full" />
            <SkeletonLine className="h-5 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
      <section>
        <div className="aspect-[1/1.02] border border-border bg-card/75">
          <div className="h-full w-full animate-pulse-slow bg-card-hover/80" />
        </div>
        <div className="grid grid-cols-5 gap-2 border-x border-b border-border bg-black/30 p-2">
          {[1, 2, 3, 4, 5].map((thumb) => (
            <div key={thumb} className="aspect-square animate-pulse-slow border border-border bg-card-hover/80" />
          ))}
        </div>
      </section>
      <section className="border border-border bg-card/30 p-5 sm:p-6">
        <div className="space-y-4">
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="h-12 w-4/5" />
          <SkeletonLine className="h-5 w-1/3" />
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-11/12" />
          <SkeletonLine className="h-11 w-full" />
          <SkeletonLine className="h-12 w-full" />
        </div>
      </section>
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="border border-border bg-card/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <SkeletonLine className="h-4 w-28" />
          <SkeletonLine className="h-3 w-24" />
        </div>
        <SkeletonLine className="h-4 w-20" />
      </div>
      <div className="mt-3 space-y-2">
        <SkeletonLine className="h-3 w-full" />
        <SkeletonLine className="h-3 w-11/12" />
      </div>
    </div>
  );
}
