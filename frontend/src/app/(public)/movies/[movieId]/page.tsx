import { Suspense } from "react";
import type { Metadata } from "next";
import { MovieDetailScreen } from "@/features/movie/movie-detail-screen";
import { MovieLoading } from "@/features/movie/movie-feedback";

export const metadata: Metadata = { title: "Chi tiết phim | Smart Cinema" };

export default async function MovieDetailPage({ params }: { params: Promise<{ movieId: string }> }) {
  const { movieId } = await params;
  return <Suspense fallback={<MovieLoading detail />}><MovieDetailScreen movieId={movieId} /></Suspense>;
}
