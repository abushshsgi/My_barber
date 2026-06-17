import { Link } from "@tanstack/react-router";
import { getSalonCoverUrl } from "@/lib/cover-images";
import type { Salon } from "@/lib/mock-data";

const IMAGE_COUNT = 6;

function galleryUrls(salon: Salon): string[] {
  const urls: string[] = [];
  const portfolio = salon.portfolio.filter(Boolean);
  if (portfolio.length > 0) urls.push(...portfolio.slice(0, IMAGE_COUNT));
  const cover = salon.coverUrl?.trim() || getSalonCoverUrl(salon.coverSeed);
  for (let i = urls.length; i < IMAGE_COUNT; i += 1) {
    urls.push(i === 0 ? cover : getSalonCoverUrl(`${salon.coverSeed}-${i}`));
  }
  return urls.slice(0, IMAGE_COUNT);
}

function ImageCell({ src, fallback, salonId }: { src: string; fallback: string; salonId: string }) {
  return (
    <Link
      to="/salon/$id"
      params={{ id: salonId }}
      className="min-w-0 flex-1 overflow-hidden rounded-xl bg-[#E8E8E8] shadow-[0_4px_14px_rgba(0,0,0,0.1)] ring-1 ring-black/5 active:scale-[0.98]"
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src !== fallback) img.src = fallback;
        }}
        className="aspect-[3/4] w-full object-cover object-center"
      />
    </Link>
  );
}

function Row({ urls, fallback, salonId }: { urls: string[]; fallback: string; salonId: string }) {
  return (
    <div className="flex gap-2">
      {urls.map((src, i) => (
        <ImageCell key={`${src}-${i}`} src={src} fallback={fallback} salonId={salonId} />
      ))}
    </div>
  );
}

/** Static 3×2 image grid for the selected salon — no carousel, no swipe sheet. */
export function MapSalonGrid({ salon }: { salon: Salon }) {
  const fallback = getSalonCoverUrl(salon.coverSeed);
  const images = galleryUrls(salon);
  const top = images.slice(0, 3);
  const bottom = images.slice(3, 6);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-30 px-3"
      style={{ top: "54%" }}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-md rounded-[22px] bg-background/98 p-3 shadow-[0_16px_48px_rgba(0,0,0,0.22)] ring-1 ring-border/40 backdrop-blur-md">
        <p className="mb-2 truncate px-0.5 text-center text-[13px] font-bold tracking-tight">{salon.name}</p>
        <div className="flex flex-col gap-2">
          <Row urls={top} fallback={fallback} salonId={salon.id} />
          <Row urls={bottom} fallback={fallback} salonId={salon.id} />
        </div>
      </div>
    </div>
  );
}
