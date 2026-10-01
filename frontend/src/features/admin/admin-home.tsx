import Link from "next/link";

export function AdminHome() {
  return <section className="space-y-6"><div><p className="text-sm uppercase tracking-widest text-accent">Chain administration</p><h1 className="mt-2 text-3xl font-bold">Admin Home</h1><p className="mt-3 text-muted">Manage Movies and the Cinema → Hall → Seat hierarchy.</p></div>
    <Link href="/admin/movies" className="block rounded-xl border border-outline/40 bg-panel p-6 transition hover:bg-panel-high"><h2 className="text-xl font-semibold">Movie management</h2><p className="mt-2 text-muted">Create drafts, edit Movie information and control publication.</p><span className="mt-4 inline-block font-semibold text-accent">Open Movies →</span></Link>
    <Link href="/admin/cinemas" className="block rounded-xl border border-outline/40 bg-panel p-6 transition hover:bg-panel-high"><h2 className="text-xl font-semibold">Cinema management</h2><p className="mt-2 text-muted">Manage Cinema details, Halls and protected Seat Unit layouts.</p><span className="mt-4 inline-block font-semibold text-accent">Open Cinemas →</span></Link>
    <Link href="/admin/showtimes" className="block rounded-xl border border-outline/40 bg-panel p-6 transition hover:bg-panel-high"><h2 className="text-xl font-semibold">Showtime management</h2><p className="mt-2 text-muted">Author eligible schedules with complete Seat membership and protected history.</p><span className="mt-4 inline-block font-semibold text-accent">Open Showtimes →</span></Link>
  </section>;
}
