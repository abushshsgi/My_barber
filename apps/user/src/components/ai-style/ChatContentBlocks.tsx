import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ChatContentBlock, ChatHairstyleCard, ChatImageLayout } from "@/lib/api/ai";
import { getHairstyleImageUrl } from "@/lib/hairstyles/catalog";
import { cn } from "@/lib/utils";

function imageSrc(item: ChatHairstyleCard): string {
  return getHairstyleImageUrl({ imageUrl: item.image_url });
}

function Figure({
  item,
  eager,
  onOpen,
}: {
  item: ChatHairstyleCard;
  eager?: boolean;
  onOpen?: (item: ChatHairstyleCard) => void;
}) {
  const src = imageSrc(item);
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);
  const frame = (
      <span className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-[#F0F0F0] dark:bg-white/10">
        {!loaded && !failed ? (
          <span className="absolute inset-0 animate-pulse bg-black/10 dark:bg-white/10" />
        ) : null}
        {!failed && src ? (
          <img
            src={src}
            alt={item.name}
            width={800}
            height={1000}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "low"}
            decoding="async"
            className={cn(
              "h-full w-full object-cover object-top",
              loaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="grid h-full place-items-center text-xs text-[#111111]/45 dark:text-white/50">
            Rasm yo‘q
          </span>
        )}
      </span>
  );
  if (onOpen) {
    return (
      <button type="button" onClick={() => onOpen(item)} className="block w-full cursor-pointer text-left">
        {frame}
      </button>
    );
  }
  return (
    <Link to="/explore/$styleId" params={{ styleId: item.id }} className="block w-full text-left">
      {frame}
    </Link>
  );
}

function Caption({ item }: { item: ChatHairstyleCard }) {
  return (
    <div className="px-0.5 pt-2">
      <p className="line-clamp-2 text-[14px] font-semibold">{item.name}</p>
      {item.description ? (
        <p className="mt-1 line-clamp-3 text-[12px] leading-snug text-[#111111]/60 dark:text-white/60">
          {item.description}
        </p>
      ) : null}
      <Link
        to="/explore/$styleId/try"
        params={{ styleId: item.id }}
        className="mt-2 inline-flex text-[11px] font-semibold text-[#111111]/70 underline-offset-2 hover:underline dark:text-white/70"
      >
        Try-on
      </Link>
    </div>
  );
}

function Tile({
  item,
  eager,
  className,
  onOpen,
}: {
  item: ChatHairstyleCard;
  eager?: boolean;
  className?: string;
  onOpen?: (item: ChatHairstyleCard) => void;
}) {
  return (
    <article className={cn("min-w-0", className)}>
      <Figure item={item} eager={eager} onOpen={onOpen} />
      <Caption item={item} />
    </article>
  );
}

function ImageGroup({
  layout,
  items,
  onOpen,
}: {
  layout: ChatImageLayout;
  items: ChatHairstyleCard[];
  onOpen?: (item: ChatHairstyleCard) => void;
}) {
  useEffect(() => {
    const next = items.slice(1, 6).map(imageSrc).filter(Boolean);
    next.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [items]);

  if (layout === "single_image" || items.length === 1) {
    return <Tile item={items[0]!} eager className="w-full" onOpen={onOpen} />;
  }

  if (layout === "image_carousel") {
    return (
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
        {items.map((item, index) => (
          <Tile
            key={item.id}
            item={item}
            eager={index === 0}
            className="w-[82%] shrink-0 snap-start"
            onOpen={onOpen}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, index) => (
        <Tile key={item.id} item={item} eager={index === 0} onOpen={onOpen} />
      ))}
    </div>
  );
}

export function ChatContentBlocks({
  blocks,
  onOpenHairstyle,
}: {
  blocks: ChatContentBlock[];
  onOpenHairstyle?: (item: ChatHairstyleCard) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      {blocks.map((block, index) =>
        block.type === "text" ? (
          <p key={`text-${index}`} className="whitespace-pre-wrap text-[14px] leading-relaxed">
            {block.content}
          </p>
        ) : (
          <ImageGroup
            key={`img-${block.type}-${index}`}
            layout={block.type}
            items={block.items}
            onOpen={onOpenHairstyle}
          />
        ),
      )}
    </div>
  );
}
