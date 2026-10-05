import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { MovieCatalog } from "@/features/movie/movie-catalog";
import { MovieLoading } from "@/features/movie/movie-feedback";

export const metadata: Metadata = { title: "Danh sách phim | Smart Cinema", description: "Khám phá phim, thể loại và thông tin chi tiết tại Smart Cinema." };

export default function MoviesPage() {
  return <>
    <div className="mb-8 rounded-2xl bg-linear-to-r from-action/10 to-transparent px-1 py-6 sm:py-8">
      <nav aria-label="Đường dẫn điều hướng" className="mb-5 flex gap-2 font-heading text-xs uppercase text-muted"><Link href="/" className="hover:text-accent">Trang chủ</Link><span aria-hidden="true">/</span><span className="text-accent">Phim</span></nav>
      <p className="mb-3 font-heading text-xs font-semibold uppercase tracking-[.2em] text-accent">Khám phá câu chuyện tiếp theo</p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Danh sách phim</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted">Khám phá những câu chuyện chạm đến cảm xúc. Tìm phim, chọn thể loại và xem chi tiết.</p>
    </div>
    <Suspense fallback={<MovieLoading />}><MovieCatalog /></Suspense>
  </>;
}
