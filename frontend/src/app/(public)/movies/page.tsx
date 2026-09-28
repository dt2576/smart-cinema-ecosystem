import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { MovieCatalog } from "@/features/movie/movie-catalog";
import { MovieLoading } from "@/features/movie/movie-feedback";

export const metadata: Metadata = { title: "Movie Catalogue | Smart Cinema", description: "Find your next Movie. Explore titles, Genres and Movie details at Smart Cinema." };

export default function MoviesPage() {
  return <>
    <div className="mb-8 rounded-2xl bg-linear-to-r from-action/10 to-transparent px-1 py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="mb-5 flex gap-2 font-heading text-xs uppercase text-muted"><Link href="/" className="hover:text-accent">Home</Link><span aria-hidden="true">/</span><span className="text-accent">Movies</span></nav>
      <p className="mb-3 font-heading text-xs font-semibold uppercase tracking-[.2em] text-accent">Discover your next story</p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Movie Catalogue</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted">Explore the stories that move you. Find a title, discover a Genre, and take a closer look.</p>
    </div>
    <Suspense fallback={<MovieLoading />}><MovieCatalog /></Suspense>
  </>;
}
