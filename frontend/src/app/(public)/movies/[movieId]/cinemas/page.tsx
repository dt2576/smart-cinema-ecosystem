import { Suspense } from "react";
import type { Metadata } from "next";
import { CinemaSelectionScreen } from "@/features/cinema/cinema-selection-screen";
import { MovieLoading } from "@/features/movie/movie-feedback";

export const metadata: Metadata = { title: "Chọn rạp | Smart Cinema" };

export default async function CinemaSelectionPage({ params }: { params: Promise<{ movieId: string }> }) {
  const { movieId } = await params;
  return <Suspense fallback={<MovieLoading detail />}><CinemaSelectionScreen movieId={movieId} /></Suspense>;
}
