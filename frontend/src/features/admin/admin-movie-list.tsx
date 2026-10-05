"use client";

import { formatCalendarDate } from "@/lib/display-format";
import Link from "next/link";
import { displayLabel } from "@/lib/display-labels";
import { useSearchParams } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/features/admin/admin-shell";
import { getAdminMovies, setMoviePublication } from "@/features/admin/admin-api";
import { useMovieRequest } from "@/features/movie/use-movie-request";

export function AdminMovieList() {
  const params = useSearchParams();
  const { accessToken, reportError } = useAdmin();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState({ q: "", page: 0 });
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const load = useCallback((signal: AbortSignal) => {
    const query = new URLSearchParams({ q: filter.q, page: String(filter.page), size: "20", sort: "title,asc" });
    return getAdminMovies(accessToken, query.toString(), signal).catch(error => { reportError(error); throw error; });
  }, [accessToken, filter, reportError]);
  const result = useMovieRequest(load);

  async function changePublication(id: string, status: "PUBLISHED" | "UNPUBLISHED") {
    if (pending) return;
    setPending(id); setFeedback(null);
    try { await setMoviePublication(accessToken, id, status); setFeedback({ message: status === "PUBLISHED" ? "Đã công bố phim. Khách hàng có thể xem phim trong danh sách." : "Đã ngừng công bố phim. Phim không còn hiển thị cho khách hàng.", error: false }); result.retry(); }
    catch (error) { reportError(error); setFeedback({ message: error instanceof Error ? error.message : "Không thể cập nhật trạng thái công bố.", error: true }); }
    finally { setPending(null); }
  }
  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setFilter({ q: q.trim(), page: 0 }); }

  return <section className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">Phim</h1><p className="mt-2 text-muted">Danh sách phim chung, bao gồm bản nháp và phim đã ngừng công bố.</p></div><Link href="/admin/movies/new" className="rounded-lg bg-action px-4 py-3 font-semibold text-on-action hover:bg-action-hover">Thêm phim</Link></div>
    <form onSubmit={search} className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><label htmlFor="admin-search" className="mb-2 block text-sm">Tìm theo tên phim</label><input id="admin-search" value={q} onChange={event => setQ(event.target.value)} maxLength={255} className="h-11 w-full rounded-lg bg-panel-high px-4" /></div><Button type="submit" variant="secondary">Tìm kiếm</Button></form>
    {params.get("created") === "1" && <p role="status" className="text-success">Đã tạo bản nháp phim. Công bố khi sẵn sàng hiển thị cho khách hàng.</p>}
    {feedback && <p role={feedback.error ? "alert" : "status"} className={feedback.error ? "text-error" : "text-success"}>{feedback.message}</p>}
    {result.loading ? <p role="status">Đang tải phim…</p> : result.error ? <div className="space-y-4"><p role="alert" className="text-error">{result.error.message}</p><Button onClick={result.retry}>Tải lại phim</Button></div> : result.data && <>
      {result.data.items.length === 0 ? <div className="rounded-xl bg-panel p-8"><h2 className="text-xl font-semibold">Không tìm thấy phim</h2><p className="mt-2 text-muted">Tạo bản nháp hoặc thử tìm kiếm khác.</p>{filter.page > 0 && <Button onClick={() => setFilter(current => ({ ...current, page: 0 }))} className="mt-4">Về trang đầu</Button>}</div> : <div className="space-y-3">{result.data.items.map(movie => <article key={movie.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-outline/30 bg-panel p-5">
        <div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold">{movie.title}</h2><p className="mt-1 text-sm text-accent">{displayLabel(movie.status)}</p><p className="mt-2 text-sm text-muted">{movie.duration} phút · {movie.releaseDate ? formatCalendarDate(movie.releaseDate) : "Chưa có ngày khởi chiếu"} · {movie.ageRating ?? "Chưa có phân loại độ tuổi"} · {movie.language ?? "Chưa có ngôn ngữ"}</p><p className="mt-1 text-sm text-muted">{movie.genres.map(genre => genre.name).join(", ") || "Chưa có thể loại"}</p></div>
        <div className="flex flex-wrap items-center gap-2"><Link href={`/admin/movies/${encodeURIComponent(movie.id)}/edit`} aria-label={`Chỉnh sửa ${movie.title}`} className="rounded-lg bg-panel-high px-4 py-3 text-sm font-semibold hover:bg-panel-hover">Chỉnh sửa</Link>
          {["DRAFT", "UNPUBLISHED", "PUBLISHED"].includes(movie.status) && <Button disabled={pending !== null} variant="secondary" aria-label={`${movie.status === "PUBLISHED" ? "Ngừng công bố" : "Công bố"} ${movie.title}`} onClick={() => void changePublication(movie.id, movie.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED")}>{pending === movie.id ? "Đang lưu…" : movie.status === "PUBLISHED" ? "Ngừng công bố" : "Công bố"}</Button>}
        </div>
      </article>)}</div>}
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm"><span>{result.data.totalElements} phim · Trang {filter.page + 1} trên {Math.max(1, result.data.totalPages)}</span><div className="flex gap-2"><Button variant="secondary" disabled={filter.page === 0} onClick={() => setFilter(current => ({ ...current, page: current.page - 1 }))}>Trước</Button><Button variant="secondary" disabled={filter.page + 1 >= result.data.totalPages} onClick={() => setFilter(current => ({ ...current, page: current.page + 1 }))}>Sau</Button></div></div>
    </>}
  </section>;
}
