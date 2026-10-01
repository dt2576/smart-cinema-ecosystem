import { AdminMovieList } from "@/features/admin/admin-movie-list";
import { Suspense } from "react";

export default function AdminMoviesPage() { return <Suspense fallback={<p role="status">Loading Movies…</p>}><AdminMovieList /></Suspense>; }
