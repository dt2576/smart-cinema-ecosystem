"use client";

import { useEffect, useState } from "react";

// Keep the result tied to its request identity. Aborted/stale requests cannot replace a newer screen.
export function useMovieRequest<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ load: typeof load; attempt: number; data?: T; error?: Error }>();
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    load(controller.signal).then(
      data => { if (active) setResult({ load, attempt, data }); },
      error => { if (active) setResult({ load, attempt, error: error instanceof Error ? error : new Error("Vui lòng thử lại.") }); },
    );
    return () => { active = false; controller.abort(); };
  }, [load, attempt]);
  const current = result?.load === load && result.attempt === attempt ? result : undefined;
  return { data: current?.data, error: current?.error, loading: !current, retry: () => setAttempt(value => value + 1) };
}
