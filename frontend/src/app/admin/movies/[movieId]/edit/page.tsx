import { AdminMovieForm } from "@/features/admin/admin-movie-form";

export default async function EditMoviePage({ params }: { params: Promise<{ movieId: string }> }) {
  const { movieId } = await params;
  return <AdminMovieForm movieId={movieId} />;
}
