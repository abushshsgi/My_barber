import { useState } from "react";
import { cn } from "@/lib/utils";
import type { HairstyleGalleryItem } from "@/lib/hairstyles/catalog";

type Props = {
  items: HairstyleGalleryItem[];
  title: string;
  badge?: React.ReactNode;
  className?: string;
};

export function ExploreStyleGallery({ items, title, badge, className }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = items[activeIndex] ?? items[0];

  if (!items.length) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-hidden rounded-3xl border border-border bg-[#E8E8E8]">
        <div className="relative aspect-[3/4]">
          <img
            key={active?.url}
            src={active?.url}
            alt={`${title} — ${active?.label ?? ""}`}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          {badge ? <div className="absolute left-3 top-3">{badge}</div> : null}
          {active?.label ? (
            <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              {active.label}
            </span>
          ) : null}
        </div>
      </div>

      {items.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {items.map((item, index) => (
            <button
              key={`${item.view}-${item.url}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "overflow-hidden rounded-xl border-2 transition",
                index === activeIndex ? "border-foreground" : "border-transparent opacity-80 hover:opacity-100",
              )}
            >
              <div className="relative aspect-[3/4] bg-[#E8E8E8]">
                <img
                  src={item.url}
                  alt={`${title} ${item.label}`}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              </div>
              <p className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
