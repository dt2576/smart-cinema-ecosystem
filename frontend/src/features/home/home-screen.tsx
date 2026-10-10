"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CinemaBrand, SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { PreviewDialog } from "@/components/ui/preview-dialog";
import { HomeMovies } from "@/features/home/home-movies";
import { CINEMAS, OFFERS } from "@/features/home/home-mock-data";
import { useAuth } from "@/features/auth/auth-context";

type Preview = { title: string; content: ReactNode };
const CONTAINER = "mx-auto w-full max-w-7xl px-4 lg:px-10";

function SectionHeading({ title, eyebrow, description, action, icon = "arrow", onAction }: { title: string; eyebrow?: string; description: string; action: string; icon?: IconName; onAction: () => void }) {
  return <div className="flex flex-col justify-between gap-4 pb-6 sm:flex-row sm:items-end">
    <div className="space-y-1">
      {eyebrow && <p className="flex items-center gap-2 font-heading text-xs font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>}
      <h2 className="text-[28px] font-bold tracking-tight lg:text-4xl">{title}</h2>
      <p className="text-sm leading-6 text-muted">{description}</p>
    </div>
    <Button variant="text" onClick={onAction} className="self-start px-0 sm:shrink-0">{action}<Icon name={icon} /></Button>
  </div>;
}

export function HomeScreen() {
  const { session, isHydrated } = useAuth();
  const [preview, setPreview] = useState<Preview | null>(null);
  const unavailable = (title: string) => setPreview({ title, content: title.startsWith("Suất chiếu")
    ? <div className="space-y-4 text-sm leading-7 text-muted"><p>Chọn phim trước, rồi chọn rạp và suất chiếu. Các địa điểm mẫu trên trang chủ không xác nhận có suất chiếu thực tế.</p><Link href="/movies" className="inline-flex min-h-11 items-center rounded-lg bg-action px-5 font-semibold text-on-action">Chọn phim</Link></div>
    : <p className="leading-7 text-muted">Phần này là bản xem trước thiết kế. {title} chưa khả dụng. Chưa thay đổi đặt vé, thanh toán hay tài khoản.</p> });
  return <>
    <a href="#main-content" className="fixed left-4 top-4 z-50 -translate-y-24 rounded-lg bg-action p-3 text-on-action focus:translate-y-0">Chuyển đến nội dung</a>
    <SiteHeader onPreview={unavailable} />
    <main id="main-content">
      <HomeMovies />
      <section id="cinemas" aria-label="Rạp chiếu phim" className={`${CONTAINER} py-10`}>
        <SectionHeading title="Tìm rạp Smart Cinema" eyebrow="Địa điểm" description="Địa điểm mẫu trong bản xem trước thiết kế. Chọn phim để khám phá quy trình chọn vé." action="Tất cả địa điểm" icon="pin" onAction={() => setPreview({ title: "Địa điểm Smart Cinema", content: <ul className="space-y-5 text-muted">{CINEMAS.map(cinema => <li key={cinema.image}><strong className="block text-foreground">{cinema.name}</strong>{cinema.address}</li>)}</ul> })} />
        <div className="grid gap-6 md:grid-cols-3">{CINEMAS.map(cinema => <article key={cinema.image} className="group overflow-hidden rounded-xl bg-panel">
          <div className="relative h-48 overflow-hidden"><Image src={`/images/home/${cinema.image}.jpg`} alt={`${cinema.name} — nội thất`} fill sizes="(min-width: 768px) 380px, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-linear-to-t from-panel via-panel/40 to-transparent" /></div>
          <div className="flex flex-col gap-4 p-6"><h3 className="text-[22px] font-bold">{cinema.name}</h3><p className="flex gap-2 text-xs leading-5 text-muted"><Icon name="pin" className="shrink-0 text-accent" />{cinema.address}</p><div className="grid grid-cols-2 gap-2"><Button variant="secondary" className="px-2 text-xs" onClick={() => setPreview({ title: cinema.name, content: <p className="leading-7 text-muted">{cinema.address}<br />Địa điểm rạp mẫu.</p> })}>Xem rạp</Button><Button className="px-2 text-xs" onClick={() => unavailable(`Suất chiếu — ${cinema.name}`)}>Xem suất chiếu</Button></div></div>
        </article>)}</div>
      </section>
      <section id="promotions" aria-label="Ưu đãi và khuyến mãi" className="bg-canvas py-10">
        <div className={CONTAINER}>
          <SectionHeading title="Ưu đãi & khuyến mãi" description="Ưu đãi minh họa, chưa có hiệu lực và không áp dụng vào bản xem trước đặt vé." action="Xem tất cả ưu đãi" icon="gift" onAction={() => setPreview({ title: "Ưu đãi mẫu", content: <p className="leading-7 text-muted">Ba ưu đãi này là ví dụ thiết kế. Giảm giá, điều kiện và khả năng áp dụng chưa có hiệu lực.</p> })} />
          <div className="grid gap-6 md:grid-cols-3">{OFFERS.map(offer => <article key={offer.title} className="flex flex-col justify-between gap-4 rounded-xl bg-panel-low p-6">
            <div className="space-y-3"><span className="flex size-12 items-center justify-center rounded-lg bg-panel-high text-accent"><Icon name={offer.icon} width={28} height={28} /></span><h3 className="text-[22px] font-bold">{offer.title}</h3><p className="text-sm leading-7 text-muted">{offer.description}</p></div>
            <div className="space-y-2 border-t border-panel pt-3"><p className="flex items-center gap-2 text-xs text-muted"><Icon name="calendar" className="text-accent" />{offer.validity}</p><Button variant="text" className="px-0 text-xs" onClick={() => setPreview({ title: offer.title, content: <div className="space-y-4 leading-7 text-muted"><p>{offer.description}</p><p>Chỉ là ưu đãi mẫu. Không áp dụng giảm giá hay điều kiện ưu đãi.</p></div> })}>Xem ưu đãi<Icon name="arrow" width={16} /></Button></div>
          </article>)}</div>
          <p className="mt-5 text-xs leading-5 text-muted">Bản xem trước thiết kế · Địa điểm và ưu đãi bên dưới danh sách phim là nội dung mẫu. Chưa hỗ trợ đặt vé tại đây.</p>
        </div>
      </section>
    </main>
    <footer className="mt-10 bg-canvas py-10">
      <div className={CONTAINER}>
        <div className="flex flex-col justify-between gap-6 pb-10 lg:flex-row lg:items-center"><div className="space-y-2"><a href="#home"><CinemaBrand /></a><p className="max-w-sm text-xs leading-6 text-muted">Không gian điện ảnh tinh tế và trải nghiệm chọn ghế cao cấp.</p></div><nav aria-label="Điều hướng chân trang" className="flex flex-wrap gap-x-6 gap-y-2 font-heading text-xs uppercase tracking-wider text-muted"><Link className="py-3 hover:text-accent" href="/movies">Phim</Link><a className="py-3 hover:text-accent" href="#cinemas">Rạp chiếu phim</a>{isHydrated && (!session || session.user.role === "CUSTOMER") && <Link className="py-3 hover:text-accent" href="/my-bookings">Vé của tôi</Link>}{["Hỗ trợ", "Điều khoản & quyền riêng tư", "Quy định vào rạp"].map(label => <button key={label} className="py-3 uppercase hover:text-accent" onClick={() => unavailable(label)}>{label}</button>)}</nav></div>
        <p className="pt-6 text-xs text-muted">© 2025 Smart Cinema Group Inc. Bảo lưu mọi quyền.</p>
      </div>
    </footer>
    {preview && <PreviewDialog title={preview.title} onClose={() => setPreview(null)}>{preview.content}</PreviewDialog>}
  </>;
}
