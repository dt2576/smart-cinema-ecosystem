import { Skeleton } from "@/components/ui/skeleton";
import { SurfaceCard } from "@/components/ui/surface-card";

export function BookingSummarySkeleton({ message = "Đang tải đơn đặt vé…", compact = false }: { message?: string; compact?: boolean }) {
  return <div className="min-w-0 space-y-6">
    <p role="status" className="text-body text-muted">{message}</p>
    <div aria-hidden="true" className={`grid gap-6 ${compact ? "" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]"}`}>
      <SurfaceCard className="space-y-5"><Skeleton className="h-28 w-20" /><Skeleton className="h-8 w-3/4" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-2/3" /><div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-24" /><Skeleton className="h-24" /></div></SurfaceCard>
      {!compact && <SurfaceCard className="space-y-5"><Skeleton className="h-7 w-2/3" /><Skeleton className="h-5" /><Skeleton className="h-5" /><Skeleton className="h-12" /><Skeleton className="h-24" /></SurfaceCard>}
    </div>
  </div>;
}
