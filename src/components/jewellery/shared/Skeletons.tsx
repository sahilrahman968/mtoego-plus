function Line({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-card-hover ${className}`} />;
}

export function ProductCardSkeleton() {
  return <div><div className="aspect-[4/5] animate-pulse bg-[#EEE9E0]" /><div className="space-y-2 pt-4"><Line className="h-3 w-20" /><Line className="h-5 w-4/5" /><Line className="h-4 w-24" /></div></div>;
}

export function CategoryCardSkeleton() {
  return <div><div className="aspect-[4/5] animate-pulse bg-[#EEE9E0]" /><Line className="mt-4 h-7 w-2/3" /></div>;
}

export function CartItemSkeleton() {
  return <div className="flex gap-4 border-b border-border py-5"><div className="size-24 animate-pulse bg-card-hover" /><div className="flex-1 space-y-3"><Line className="h-5 w-3/4" /><Line className="h-3 w-1/2" /><Line className="h-5 w-24" /></div></div>;
}

export function OrderListCardSkeleton() {
  return <div className="border border-border bg-card p-5"><div className="space-y-3"><Line className="h-5 w-32" /><Line className="h-12 w-full" /><Line className="h-3 w-48" /></div></div>;
}

export function OrderDetailPageSkeleton() {
  return <div className="space-y-8"><Line className="h-12 w-64" /><div className="grid gap-6 lg:grid-cols-3"><div className="space-y-5 lg:col-span-2"><Line className="h-48 w-full" /><Line className="h-64 w-full" /></div><Line className="h-72 w-full" /></div></div>;
}

export function ProductDetailSkeleton() {
  return <div className="grid gap-10 lg:grid-cols-2"><div className="aspect-[4/5] animate-pulse bg-[#EEE9E0]" /><div className="space-y-5 py-6"><Line className="h-3 w-28" /><Line className="h-16 w-4/5" /><Line className="h-6 w-32" /><Line className="h-24 w-full" /><Line className="h-12 w-full" /></div></div>;
}

export function ReviewCardSkeleton() {
  return <div className="border-t border-border py-5"><div className="space-y-3"><Line className="h-4 w-28" /><Line className="h-3 w-full" /><Line className="h-3 w-4/5" /></div></div>;
}
