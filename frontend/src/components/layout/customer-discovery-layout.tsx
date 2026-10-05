import Link from "next/link";
import type { ReactNode } from "react";
import { CinemaBrand, SiteHeader } from "@/components/layout/site-header";

export function CustomerDiscoveryLayout({ children }: { children: ReactNode }) {
  return <>
    <a href="#discovery-content" className="sr-only z-50 rounded-lg bg-action p-3 text-on-action focus:fixed focus:left-4 focus:top-4 focus:not-sr-only">Chuyển đến nội dung</a>
    <SiteHeader />
    <main id="discovery-content" className="mx-auto min-h-[75vh] w-full max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-10">{children}</main>
    <footer className="mt-auto border-t border-outline/20 bg-canvas px-4 py-10 sm:px-6"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 lg:px-4"><div><Link href="/" aria-label="Trang chủ Smart Cinema"><CinemaBrand /></Link><p className="mt-3 text-xs text-muted">Câu chuyện tiếp theo của bạn bắt đầu tại đây.</p></div><Link href="/movies" className="inline-flex min-h-11 items-center font-heading text-xs uppercase tracking-wider text-accent">Khám phá phim</Link></div></footer>
  </>;
}
