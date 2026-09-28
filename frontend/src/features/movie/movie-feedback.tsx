import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function MovieFeedback({ title, message, retry, reset = false }: { title: string; message: string; retry?: () => void; reset?: boolean }) {
  return <section className="rounded-2xl border border-outline/40 bg-panel-low px-6 py-12 text-center" aria-live="polite">
    <Icon name="film" width={36} height={36} className="mx-auto mb-4 text-accent" />
    <h2 className="text-2xl font-semibold">{title}</h2>
    <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">{message}</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      {retry && <Button onClick={retry}>Try again</Button>}
      {reset && <Link href="/movies" className="inline-flex min-h-11 items-center rounded-lg bg-panel-high px-5 font-heading text-sm font-semibold hover:bg-panel-hover">Reset filters</Link>}
    </div>
  </section>;
}

export function MovieLoading({ detail = false }: { detail?: boolean }) {
  return <div role="status" aria-label={detail ? "Loading Movie details" : "Loading Movies"} className="space-y-6">
    <p className="font-heading text-sm text-muted">{detail ? "Loading Movie details…" : "Loading Movies…"}</p>
    <div aria-hidden="true" className={`grid gap-5 ${detail ? "max-w-3xl grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"}`}>
      {Array.from({ length: detail ? 2 : 5 }, (_, i) => <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-panel-high" />)}
    </div>
  </div>;
}
