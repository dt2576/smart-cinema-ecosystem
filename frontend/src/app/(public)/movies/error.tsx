"use client";

import { MovieFeedback } from "@/features/movie/movie-feedback";

export default function Error({ reset }: { reset: () => void }) {
  return <MovieFeedback title="Không thể tải trang này" message="Vui lòng thử lại hoặc quay về danh sách phim." retry={reset} reset />;
}
