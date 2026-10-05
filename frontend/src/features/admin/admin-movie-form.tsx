"use client";

import { displayLabel } from "@/lib/display-labels";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/features/admin/admin-shell";
import { AdminApiError, createAdminMovie, getAdminMovie, updateAdminMovie } from "@/features/admin/admin-api";
import type { AdminMovie, AdminMovieContent } from "@/features/admin/admin-movie.types";
import type { Genre } from "@/features/movie/movie.types";
import { getGenres } from "@/features/movie/movie-api";
import { isMovieId } from "@/features/movie/movie-query";
import { useMovieRequest } from "@/features/movie/use-movie-request";

export function AdminMovieForm({ movieId }: { movieId?: string }) {
  const { accessToken, reportError } = useAdmin();
  const load = useCallback(async (signal: AbortSignal) => {
    if (movieId && !isMovieId(movieId)) throw new Error("Mã phim không hợp lệ.");
    try {
      const [genres, movie] = await Promise.all([getGenres(signal), movieId ? getAdminMovie(accessToken, movieId, signal) : Promise.resolve(undefined)]);
      return { genres, movie };
    } catch (error) { reportError(error); throw error; }
  }, [accessToken, movieId, reportError]);
  const result = useMovieRequest(load);
  return <section className="space-y-6"><Link href="/admin/movies" className="text-accent hover:underline">← Về danh sách phim</Link><h1 className="text-3xl font-bold">{movieId ? "Chỉnh sửa phim" : "Thêm phim"}</h1>
    {result.loading ? <p role="status">Đang tải biểu mẫu phim…</p> : result.error ? <div className="space-y-4"><p role="alert" className="text-error">{result.error.message}</p><Button onClick={result.retry}>Tải lại biểu mẫu</Button></div> : result.data && <MovieContentForm key={movieId ?? "new"} genres={result.data.genres} movie={result.data.movie} />}
  </section>;
}

function MovieContentForm({ genres, movie }: { genres: Genre[]; movie?: AdminMovie }) {
  const { accessToken, reportError } = useAdmin();
  const router = useRouter();
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [selectedGenres, setSelectedGenres] = useState(movie?.genres.map(genre => genre.id) ?? []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const optional = (name: string) => text(name) || null;
    const content: AdminMovieContent = {
      title: text("title"), duration: Number(text("duration")), releaseDate: optional("releaseDate"), ageRating: optional("ageRating"), language: optional("language"),
      posterUrl: optional("posterUrl"), description: optional("description"), trailerUrl: optional("trailerUrl"), genreIds: selectedGenres,
    };
    const nextErrors: Record<string, string> = {};
    if (!content.title || [...content.title].length > 255) nextErrors.title = "Nhập tên phim không quá 255 ký tự.";
    if (!Number.isInteger(content.duration) || content.duration <= 0 || content.duration > 2147483647) nextErrors.duration = "Nhập thời lượng là số nguyên dương (phút).";
    if (movie?.status === "PUBLISHED") for (const field of ["releaseDate", "ageRating", "language", "posterUrl"] as const) if (!content[field]) nextErrors[field] = "Bắt buộc khi phim đang được công bố.";
    setErrors(nextErrors); setFeedback("");
    if (Object.keys(nextErrors).length) { setFeedback("Kiểm tra các trường được đánh dấu."); return; }
    busy.current = true; setSaving(true);
    try {
      if (movie) { await updateAdminMovie(accessToken, movie.id, content); setFeedback("Đã lưu thay đổi của phim."); }
      else { await createAdminMovie(accessToken, content); router.push("/admin/movies?created=1"); }
    } catch (error) {
      reportError(error);
      if (error instanceof AdminApiError) setErrors(error.fieldErrors);
      setFeedback(error instanceof Error ? error.message : "Không thể lưu phim.");
    } finally { busy.current = false; setSaving(false); }
  }

  const inputClass = "mt-2 min-h-11 w-full rounded-lg border border-outline/40 bg-panel-high px-3 py-2 aria-[invalid=true]:border-error";
  const fields = [
    { name: "title", label: "Tên phim", max: 255, type: "text", required: true },
    { name: "duration", label: "Thời lượng (phút)", type: "number", required: true },
    { name: "releaseDate", label: "Ngày khởi chiếu", type: "date" },
    { name: "ageRating", label: "Phân loại độ tuổi", max: 20, type: "text" },
    { name: "language", label: "Ngôn ngữ", max: 100, type: "text" },
    { name: "posterUrl", label: "URL áp phích", max: 2048, type: "text" },
    { name: "trailerUrl", label: "URL đoạn giới thiệu (không bắt buộc)", max: 2048, type: "text" },
  ] as const;
  return <form noValidate onSubmit={submit} aria-busy={saving} className="space-y-6 rounded-xl border border-outline/30 bg-panel p-5 md:p-7">
    <p className="text-sm text-muted">{movie ? `Công bố: ${displayLabel(movie.status)}. Chỉnh sửa nội dung không thay đổi trạng thái hiện tại.` : "Phim mới được lưu dưới dạng bản nháp và chưa hiển thị cho khách hàng."} Để công bố phim, cần có tên, thời lượng, ngày khởi chiếu, phân loại độ tuổi, ngôn ngữ và URL áp phích.</p>
    <fieldset disabled={saving} className="grid gap-5 md:grid-cols-2"><legend className="sr-only">Thông tin phim</legend>{fields.map(field => <div key={field.name} className={field.name.endsWith("Url") ? "md:col-span-2" : ""}>
      <label htmlFor={`movie-${field.name}`} className="text-sm font-semibold">{field.label}{"required" in field && field.required ? " *" : ""}</label>
      <input id={`movie-${field.name}`} name={field.name} type={field.type} defaultValue={movie?.[field.name] ?? ""} maxLength={"max" in field ? field.max : undefined} min={field.type === "number" ? 1 : field.type === "date" ? "0001-01-01" : undefined} max={field.type === "date" ? "9999-12-31" : undefined} step={field.type === "number" ? 1 : undefined} required={"required" in field && field.required} aria-invalid={!!errors[field.name]} aria-describedby={errors[field.name] ? `error-${field.name}` : undefined} className={inputClass} />
      {errors[field.name] && <p id={`error-${field.name}`} className="mt-2 text-sm text-error">{errors[field.name]}</p>}
    </div>)}<div className="md:col-span-2"><label htmlFor="movie-description" className="text-sm font-semibold">Mô tả (không bắt buộc)</label><textarea id="movie-description" name="description" defaultValue={movie?.description ?? ""} rows={5} className={inputClass} aria-invalid={!!errors.description} /><p className="text-sm text-error">{errors.description}</p></div></fieldset>
    <fieldset disabled={saving} className="space-y-3"><legend className="mb-3 font-semibold">Thể loại (không bắt buộc)</legend>{genres.length ? <div className="flex flex-wrap gap-3">{genres.map(genre => <label key={genre.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-panel-high px-3"><input type="checkbox" checked={selectedGenres.includes(genre.id)} onChange={event => setSelectedGenres(ids => event.target.checked ? [...ids, genre.id] : ids.filter(id => id !== genre.id))} className="size-4 accent-action" /><span className="text-sm">{genre.name}</span></label>)}</div> : <p className="text-sm text-muted">Chưa có thể loại để chọn. Bạn có thể lưu mà không chọn thể loại.</p>}{errors.genreIds && <p className="text-sm text-error">{errors.genreIds}</p>}</fieldset>
    {feedback && <p role="status" className="text-sm text-accent">{feedback}</p>}
    <div className="flex flex-wrap items-center gap-4"><Button type="submit" disabled={saving}>{saving ? "Đang lưu…" : movie ? "Lưu thay đổi" : "Tạo bản nháp"}</Button><Link href="/admin/movies" className="text-muted hover:text-foreground">Hủy</Link></div>
  </form>;
}
