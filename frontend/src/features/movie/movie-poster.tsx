"use client";

import { useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { safeMediaUrl } from "@/features/movie/movie-query";

export function MoviePoster({ url, title, priority = false }: { url: string | null; title: string; priority?: boolean }) {
  const src = safeMediaUrl(url);
  const [failed, setFailed] = useState<string | null>(null);
  return <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-panel-high">
    {src && failed !== src
      ? <Image src={src} alt={`${title} — áp phích`} fill unoptimized loading={priority ? "eager" : "lazy"} sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw" className="object-cover transition-transform duration-300 group-hover:scale-105" onError={() => setFailed(src)} />
      : <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-muted"><Icon name="film" width={36} height={36} /><span className="text-xs">Chưa có áp phích</span></div>}
  </div>;
}
