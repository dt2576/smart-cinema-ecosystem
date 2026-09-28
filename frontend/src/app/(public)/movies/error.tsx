"use client";

import { MovieFeedback } from "@/features/movie/movie-feedback";

export default function Error({ reset }: { reset: () => void }) {
  return <MovieFeedback title="This page couldn’t load" message="Please try again or return to the Movie catalog." retry={reset} reset />;
}
