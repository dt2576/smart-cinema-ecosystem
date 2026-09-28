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
  const [preview, setPreview] = useState<Preview | null>(null);
  const unavailable = (title: string) => setPreview({ title, content: <p className="leading-7 text-muted">This section is a design preview. {title} is not available yet. No booking, payment or account changes have been made.</p> });
  return <>
    <a href="#main-content" className="fixed left-4 top-4 z-50 -translate-y-24 rounded-lg bg-action p-3 text-on-action focus:translate-y-0">Skip to content</a>
    <SiteHeader onPreview={unavailable} />
    <main id="main-content">
      <HomeMovies />
      <section id="cinemas" aria-label="Cinemas" className={`${CONTAINER} py-10`}>
        <SectionHeading title="Find a Smart Cinema" eyebrow="Destinations" description="Experience cinematic luxury across our flagship architectural locations." action="All Locations" icon="pin" onAction={() => setPreview({ title: "Smart Cinema locations", content: <ul className="space-y-5 text-muted">{CINEMAS.map(cinema => <li key={cinema.image}><strong className="block text-foreground">{cinema.name}</strong>{cinema.address}</li>)}</ul> })} />
        <div className="grid gap-6 md:grid-cols-3">{CINEMAS.map(cinema => <article key={cinema.image} className="group overflow-hidden rounded-xl bg-panel">
          <div className="relative h-48 overflow-hidden"><Image src={`/images/home/${cinema.image}.jpg`} alt={`${cinema.name} interior`} fill sizes="(min-width: 768px) 380px, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-linear-to-t from-panel via-panel/40 to-transparent" /></div>
          <div className="flex flex-col gap-4 p-6"><h3 className="text-[22px] font-bold">{cinema.name}</h3><p className="flex gap-2 text-xs leading-5 text-muted"><Icon name="pin" className="shrink-0 text-accent" />{cinema.address}</p><div className="grid grid-cols-2 gap-2"><Button variant="secondary" className="px-2 text-xs" onClick={() => setPreview({ title: cinema.name, content: <p className="leading-7 text-muted">{cinema.address}<br />Sample cinema location.</p> })}>View Cinema</Button><Button className="px-2 text-xs" onClick={() => unavailable(`Showtimes — ${cinema.name}`)}>View Showtimes</Button></div></div>
        </article>)}</div>
      </section>
      <section id="promotions" aria-label="Offers and promotions" className="bg-canvas py-10">
        <div className={CONTAINER}>
          <SectionHeading title="Offers & Promotions" description="Exclusive ticket bundles and concession perks for film lovers." action="View All Offers" icon="gift" onAction={() => setPreview({ title: "Sample offers", content: <p className="leading-7 text-muted">The three offers shown are design examples. Discounts, eligibility and availability are not active in this preview.</p> })} />
          <div className="grid gap-6 md:grid-cols-3">{OFFERS.map(offer => <article key={offer.title} className="flex flex-col justify-between gap-4 rounded-xl bg-panel-low p-6">
            <div className="space-y-3"><span className="flex size-12 items-center justify-center rounded-lg bg-panel-high text-accent"><Icon name={offer.icon} width={28} height={28} /></span><h3 className="text-[22px] font-bold">{offer.title}</h3><p className="text-sm leading-7 text-muted">{offer.description}</p></div>
            <div className="space-y-2 border-t border-panel pt-3"><p className="flex items-center gap-2 text-xs text-muted"><Icon name="calendar" className="text-accent" />{offer.validity}</p><Button variant="text" className="px-0 text-xs" onClick={() => setPreview({ title: offer.title, content: <div className="space-y-4 leading-7 text-muted"><p>{offer.description}</p><p>Sample offer only. No discount or eligibility rules are applied.</p></div> })}>View Offer<Icon name="arrow" width={16} /></Button></div>
          </article>)}</div>
          <p className="mt-5 text-xs leading-5 text-muted">Design preview · Locations and offers below the Movie collection are sample content. Booking is not available.</p>
        </div>
      </section>
    </main>
    <footer className="mt-10 bg-canvas py-10">
      <div className={CONTAINER}>
        <div className="flex flex-col justify-between gap-6 pb-10 lg:flex-row lg:items-center"><div className="space-y-2"><a href="#home"><CinemaBrand /></a><p className="max-w-sm text-xs leading-6 text-muted">Atmospheric Lounge & Reserve. Refined cinema architecture and premium seat reservation.</p></div><nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-2 font-heading text-xs uppercase tracking-wider text-muted"><Link className="py-3 hover:text-accent" href="/movies">Movies</Link><a className="py-3 hover:text-accent" href="#cinemas">Cinemas</a><Link className="py-3 hover:text-accent" href="/my-bookings">My Bookings</Link>{["Support", "Terms & Privacy", "Admissions Policy"].map(label => <button key={label} className="py-3 uppercase hover:text-accent" onClick={() => unavailable(label)}>{label}</button>)}</nav></div>
        <p className="pt-6 text-xs text-muted">© 2025 Smart Cinema Group Inc. All rights reserved.</p>
      </div>
    </footer>
    {preview && <PreviewDialog title={preview.title} onClose={() => setPreview(null)}>{preview.content}</PreviewDialog>}
  </>;
}
