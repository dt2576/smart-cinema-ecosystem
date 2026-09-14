import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Movie } from "@/features/movie/movie.types";

export function MovieCard({ movie, onDetails, onShowtimes }: { movie: Movie; onDetails: (movie: Movie) => void; onShowtimes: (movie: Movie) => void }) {
  return (
    <article className={`group flex min-w-0 flex-col overflow-hidden rounded-xl ${movie.opening ? "bg-panel-low" : "bg-panel"}`}>
      <div className="relative aspect-[2/3] overflow-hidden bg-panel-high">
        <Image src={movie.posterUrl} alt={`${movie.title} poster`} fill sizes={movie.opening ? "(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw" : "(min-width: 1280px) 220px, (min-width: 768px) 30vw, 45vw"} className="object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className={`absolute left-2 rounded bg-canvas/90 px-2 py-1 font-heading text-[10px] font-bold text-accent ${movie.opening ? "bottom-2" : "top-2"}`}>{movie.ageRating}</span>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          {movie.opening && <p className="text-xs font-semibold uppercase text-accent">Opening {movie.opening}</p>}
          <h3 title={movie.title} className={`text-lg font-semibold group-hover:text-accent ${movie.opening ? "mt-1" : "truncate"}`}>{movie.title}</h3>
          {movie.metadata && <p title={movie.metadata} className="mt-1 truncate text-xs leading-5 text-muted">{movie.metadata}</p>}
        </div>
        <div className="flex flex-col gap-1">
          {!movie.opening && <Button className="w-full px-2 text-xs" onClick={() => onShowtimes(movie)} aria-label={`View showtimes for ${movie.title}`}>View Showtimes</Button>}
          <Button variant="secondary" className="w-full px-2 text-xs" onClick={() => onDetails(movie)} aria-label={`View details for ${movie.title}`}>View Details</Button>
        </div>
      </div>
    </article>
  );
}
