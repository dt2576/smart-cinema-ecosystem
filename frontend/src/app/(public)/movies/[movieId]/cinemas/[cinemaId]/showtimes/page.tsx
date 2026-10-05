import { Suspense } from "react";
import type { Metadata } from "next";
import { ShowtimeSelectionScreen } from "@/features/showtime/showtime-selection-screen";
import { MovieLoading } from "@/features/movie/movie-feedback";

export const metadata: Metadata = { title: "Chọn suất chiếu | Smart Cinema" };

export default async function ShowtimeSelectionPage({ params }: { params: Promise<{ movieId: string; cinemaId: string }> }) {
  const { movieId, cinemaId } = await params;
  return <Suspense fallback={<MovieLoading detail />}><ShowtimeSelectionScreen movieId={movieId} cinemaId={cinemaId} /></Suspense>;
}
