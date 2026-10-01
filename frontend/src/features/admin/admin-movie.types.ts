import type { MovieDetail, MovieSummary, MovieSort } from "@/features/movie/movie.types";

export type MoviePublicationStatus = "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
export type AdminIdentity = { id: string; fullName: string; role: "ADMIN" };
// Raw stored statuses are readable for diagnosis; writes use the approved allowlist.
export type AdminMovie = Omit<MovieDetail, "status"> & { status: string };
export type AdminMoviePage = {
  items: (Omit<MovieSummary, "status"> & { status: string })[];
  page: number; size: number; totalElements: number; totalPages: number; sort: MovieSort;
};
export type AdminMovieContent = {
  title: string; duration: number; releaseDate: string | null; ageRating: string | null;
  language: string | null; posterUrl: string | null; description: string | null;
  trailerUrl: string | null; genreIds: string[];
};
