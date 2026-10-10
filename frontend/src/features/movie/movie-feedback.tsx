import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusFeedback } from "@/components/ui/status-feedback";
import { Skeleton } from "@/components/ui/skeleton";

export function MovieFeedback({ title, message, retry, reset = false }: { title: string; message: string; retry?: () => void; reset?: boolean }) {
  return <StatusFeedback title={title} message={message} icon={<Icon name="film" width={36} height={36} />} className="py-12" actions={<>
      {retry && <Button onClick={retry}>Thử lại</Button>}
      {reset && <Link href="/movies" className="inline-flex min-h-11 items-center rounded-lg bg-panel-high px-5 font-heading text-sm font-semibold hover:bg-panel-hover">Đặt lại bộ lọc</Link>}
    </>} />;
}

export function MovieLoading({ detail = false }: { detail?: boolean }) {
  return <div role="status" aria-label={detail ? "Đang tải chi tiết phim" : "Đang tải phim"} className="space-y-6">
    <p className="font-heading text-sm text-muted">{detail ? "Đang tải chi tiết phim…" : "Đang tải phim…"}</p>
    <div aria-hidden="true" className={`grid gap-5 ${detail ? "max-w-3xl grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"}`}>
      {Array.from({ length: detail ? 2 : 5 }, (_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-card" />)}
    </div>
  </div>;
}
