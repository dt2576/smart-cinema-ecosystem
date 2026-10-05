import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { MoviePoster } from "@/features/movie/movie-poster";
import type { MovieSummary } from "@/features/movie/movie.types";

export function MovieCard({ movie, href = `/movies/${movie.id}`, headingLevel = 2 }: { movie: MovieSummary; href?: string; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return <article className="group flex min-w-0 flex-col rounded-xl bg-panel">
    <Link href={href} className="flex h-full flex-col rounded-xl" aria-label={`Xem chi tiết phim ${movie.title}`}>
      <div className="relative"><MoviePoster url={movie.posterUrl} title={movie.title} />{movie.ageRating && <span className="absolute left-2 top-2 rounded bg-action px-2 py-1 font-heading text-xs font-bold text-on-action">{movie.ageRating}</span>}</div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <p className="flex items-center gap-1 text-xs text-muted"><Icon name="film" width={13} height={13} />{movie.duration} phút</p>
        <Heading className="break-words text-base font-semibold leading-snug group-hover:text-accent">{movie.title}</Heading>
        <p className="text-xs leading-5 text-muted">{movie.genres.map(genre => genre.name).join(" · ")}</p>
        <span className="mt-auto flex min-h-11 items-center justify-center gap-2 rounded-lg bg-action px-2 text-center font-heading text-xs font-bold text-on-action group-hover:bg-action-hover">Xem chi tiết <Icon name="arrow" width={16} height={16} /></span>
      </div>
    </Link>
  </article>;
}
