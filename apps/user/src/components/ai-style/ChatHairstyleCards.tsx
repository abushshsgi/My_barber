import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { ChatHairstyleCard } from "@/lib/api/ai";
import { getHairstyleImageUrl } from "@/lib/hairstyles/catalog";

function CardImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative h-40 overflow-hidden rounded-xl bg-[#F0F0F0] dark:bg-white/10">
      {!loaded && !failed ? <div className="absolute inset-0 animate-pulse bg-black/10 dark:bg-white/10" /> : null}
      {!failed && src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="grid h-full place-items-center text-xs text-[#111111]/45 dark:text-white/50">—</div>
      )}
    </div>
  );
}

export function ChatHairstyleCards({ items }: { items: ChatHairstyleCard[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => (
        <article
          key={item.id}
          className="w-[168px] shrink-0 rounded-2xl border border-black/10 bg-white p-2 text-[#111111] dark:border-white/15 dark:bg-[#1C1C1C] dark:text-white"
        >
          <Link to="/explore/$styleId" params={{ styleId: item.id }} className="block">
            <CardImage src={getHairstyleImageUrl({ imageUrl: item.image_url })} alt={item.name} />
            <p className="mt-2 line-clamp-2 text-[13px] font-semibold">{item.name}</p>
            {item.description ? (
              <p className="mt-1 line-clamp-3 text-[12px] leading-snug text-[#111111]/55 dark:text-white/60">
                {item.description}
              </p>
            ) : null}
          </Link>
          <Link
            to="/explore/$styleId/try"
            params={{ styleId: item.id }}
            className="mt-2 inline-flex rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-semibold dark:border-white/20"
          >
            Try-on
          </Link>
        </article>
      ))}
    </div>
  );
}
