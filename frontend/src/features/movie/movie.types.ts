export type Genre = { id: string; name: string };

export type MovieSummary = {
  id: string;
  title: string;
  duration: number;
  releaseDate: string | null;
  ageRating: string | null;
  language: string | null;
  posterUrl: string | null;
  status: "PUBLISHED";
  genres: Genre[];
};

export type MovieDetail = MovieSummary & {
  description: string | null;
  trailerUrl: string | null;
};

export type MovieSort = "title,asc" | "title,desc" | "releaseDate,asc" | "releaseDate,desc" | "id,asc" | "id,desc";
export type MovieQuery = { q: string; genreId: string; page: number; size: number; sort: MovieSort };
export type MoviePage = { items: MovieSummary[]; page: number; size: number; totalElements: number; totalPages: number; sort: MovieSort };
