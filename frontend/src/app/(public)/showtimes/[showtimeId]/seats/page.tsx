import { Suspense } from "react";
import type { Metadata } from "next";
import { SeatSelectionScreen } from "@/features/seat/seat-selection-screen";
import { MovieLoading } from "@/features/movie/movie-feedback";

export const metadata: Metadata = { title: "Chọn ghế | Smart Cinema" };

export default async function SeatSelectionPage({ params }: { params: Promise<{ showtimeId: string }> }) {
  const { showtimeId } = await params;
  return <Suspense fallback={<MovieLoading detail />}><SeatSelectionScreen showtimeId={showtimeId} /></Suspense>;
}
