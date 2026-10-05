import { AdminMovieList } from "@/features/admin/admin-movie-list";
import { Suspense } from "react";

export default function AdminMoviesPage() { return <Suspense fallback={<p role="status">Đang tải phim…</p>}><AdminMovieList /></Suspense>; }
