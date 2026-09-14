"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { CinemaBrand, SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { PreviewDialog } from "@/components/ui/preview-dialog";
import { MovieCard } from "@/features/movie/movie-card";
import type { Movie } from "@/features/movie/movie.types";
import { CINEMAS, COMING_SOON, DUNE_SYNOPSIS, HOME_HERO_BACKDROP_URL, NOW_SHOWING, OFFERS } from "@/features/home/home-mock-data";

type Preview = { title: string; content: ReactNode };
const CONTAINER = "mx-auto w-full max-w-7xl px-4 lg:px-10";

function SectionHeading({ title, eyebrow, description, action, icon = "arrow", onAction }: { title: string; eyebrow?: string; description: string; action: string; icon?: IconName; onAction: () => void }) {
  return <div className="flex flex-col justify-between gap-4 pb-6 sm:flex-row sm:items-end">
    <div className="space-y-1">
      {eyebrow && <p className={`flex items-center gap-2 font-heading text-xs font-semibold uppercase tracking-wider ${title === "Now Showing" ? "text-success" : "text-accent"}`}>{title === "Now Showing" && <span className="size-2.5 rounded-full bg-success" />}{eyebrow}</p>}
      <h2 className="text-[28px] font-bold tracking-tight lg:text-4xl">{title}</h2>
      <p className="text-sm leading-6 text-muted">{description}</p>
    </div>
    <Button variant="text" onClick={onAction} className="self-start px-0 sm:shrink-0">{action}<Icon name={icon} /></Button>
  </div>;
}

export function HomeScreen() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const unavailable = (title: string) => setPreview({ title, content: <p className="leading-7 text-muted">This Home preview uses sample content. {title} is not available yet. No booking, payment or account changes have been made.</p> });
  const details = (movie: Movie) => setPreview({
    title: movie.title,
    content: <div className="space-y-4"><div className="flex gap-4"><Image src={movie.posterUrl} alt={`${movie.title} poster`} width={120} height={180} className="rounded-lg object-cover" /><div className="space-y-3 text-sm text-muted"><p>{movie.ageRating}</p><p>{movie.metadata}</p>{movie.opening && <p>Sample opening date: {movie.opening}</p>}<p>Demo movie listing</p></div></div>{movie.id === "dune" && <p className="leading-7 text-muted">{DUNE_SYNOPSIS}</p>}</div>,
  });
  const showtimes = (movie: Movie) => unavailable(`Showtimes — ${movie.title}`);
  const filteredMovies = NOW_SHOWING.filter(movie => movie.title.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <a href="#main-content" className="fixed left-4 top-4 z-50 -translate-y-24 rounded-lg bg-action p-3 text-on-action focus:translate-y-0">Skip to content</a>
    <SiteHeader onPreview={unavailable} />
    <main id="main-content">
      <section id="home" aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-canvas">
        <Image src={HOME_HERO_BACKDROP_URL} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-canvas/90 via-canvas/30 to-transparent" />
        <div className={`${CONTAINER} relative flex min-h-[680px] flex-col justify-end pb-20 pt-36 lg:min-h-[800px] lg:pb-32 lg:pt-48`}>
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap gap-1 text-xs"><span className="rounded bg-panel-high px-2.5 py-1 font-bold text-accent">T16</span><span className="rounded bg-panel-high/90 px-2.5 py-1 text-muted">2h 46m</span><span className="rounded bg-panel-high/90 px-2.5 py-1 text-muted">Sci-Fi • Adventure</span></div>
            <h1 id="hero-title" className="text-4xl font-bold tracking-tight lg:text-5xl">Dune: Part Two</h1>
            <p className="max-w-2xl text-lg leading-8 text-muted">{DUNE_SYNOPSIS}</p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button className="px-8 py-3.5 shadow-lg shadow-action/15" onClick={() => showtimes(NOW_SHOWING[0])}>Book Tickets<Icon name="arrow" /></Button>
              <Button variant="secondary" className="border border-outline/40 px-6 py-3.5" onClick={() => details(NOW_SHOWING[0])}><Icon name="info" />View Details</Button>
              <Button variant="text" className="py-3.5 text-muted" onClick={() => setPreview({ title: "Dune: Part Two — Trailer", content: <p className="leading-7 text-muted">A trailer is not included in this preview. Explore the movie details while we prepare the full cinema experience.</p> })}><Icon name="play" />Watch Trailer</Button>
            </div>
          </div>
        </div>
      </section>
      <section id="now-showing" aria-label="Now Showing" className={`${CONTAINER} py-10`}>
        <SectionHeading title="Now Showing" eyebrow="In Theatres Now" description="Browse screenings today and reserve your seats across premium auditoriums." action="View All Movies" onAction={() => { setSearchOpen(!searchOpen); setQuery(""); }} />
        {searchOpen && <div className="mb-6"><label htmlFor="movie-search" className="mb-2 block text-sm text-muted">Search sample movies</label><div className="flex max-w-md items-center gap-3 rounded-lg border border-outline bg-panel px-3"><Icon name="search" /><input id="movie-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by movie title" className="min-h-12 w-full bg-transparent outline-none" /></div></div>}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6 xl:grid-cols-5">{filteredMovies.map(movie => <MovieCard key={movie.id} movie={movie} onDetails={details} onShowtimes={showtimes} />)}</div>
        {filteredMovies.length === 0 && <div role="status" className="rounded-xl bg-panel p-8 text-center"><p>No movies match “{query}”.</p><Button variant="text" onClick={() => setQuery("")}>Clear search</Button></div>}
      </section>
      <section id="coming-soon" aria-label="Coming Soon" className="bg-canvas py-10">
        <div className={CONTAINER}>
          <SectionHeading title="Coming Soon" eyebrow="Opening Soon" description="Upcoming releases opening soon at Smart Cinema. Stay tuned for advance ticketing." action="Release Calendar" icon="calendar" onAction={() => setPreview({ title: "Sample release calendar", content: <ul className="space-y-4 text-muted">{COMING_SOON.map(movie => <li key={movie.id}><strong className="block text-foreground">{movie.title}</strong>{movie.opening}</li>)}</ul> })} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">{COMING_SOON.map(movie => <MovieCard key={movie.id} movie={movie} onDetails={details} onShowtimes={showtimes} />)}</div>
        </div>
      </section>
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
          <p className="mt-5 text-xs leading-5 text-muted">Demo preview · Movie schedules, locations, dates and offers are sample content. Booking is not available.</p>
        </div>
      </section>
    </main>
    <footer className="mt-10 bg-canvas py-10">
      <div className={CONTAINER}>
        <div className="flex flex-col justify-between gap-6 pb-10 lg:flex-row lg:items-center"><div className="space-y-2"><a href="#home"><CinemaBrand /></a><p className="max-w-sm text-xs leading-6 text-muted">Atmospheric Lounge & Reserve. Refined cinema architecture and premium seat reservation.</p></div><nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-2 font-heading text-xs uppercase tracking-wider text-muted"><a className="py-3 hover:text-accent" href="#now-showing">Movies</a><a className="py-3 hover:text-accent" href="#cinemas">Cinemas</a>{["My Bookings", "Support", "Terms & Privacy", "Admissions Policy"].map(label => <button key={label} className="py-3 uppercase hover:text-accent" onClick={() => unavailable(label)}>{label}</button>)}</nav></div>
        <p className="pt-6 text-xs text-muted">© 2025 Smart Cinema Group Inc. All rights reserved.</p>
      </div>
    </footer>
    {preview && <PreviewDialog title={preview.title} onClose={() => setPreview(null)}>{preview.content}</PreviewDialog>}
  </>;
}
