import type { Salon } from "@/lib/mock-data";
import { SalonCoverImg } from "@/components/salon/SalonCoverImg";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

function galleryImages(salon: Salon): string[] {
  const raw = [
    salon.coverUrl,
    ...salon.portfolio.map((p) => resolveMediaUrl(p) ?? p),
  ].filter(Boolean) as string[];

  const out = [...raw];
  let i = 0;
  while (out.length < 3) {
    out.push(getSalonCoverUrl(`${salon.coverSeed}-${i}`, salon.category));
    i += 1;
  }
  return out.slice(0, 3);
}

export function SalonHeroGallery({
  salon,
  variant = "desktop",
}: {
  salon: Salon;
  variant?: "desktop" | "mobile";
}) {
  const images = galleryImages(salon);
  const isMobile = variant === "mobile";

  return (
    <div
      className={cn(
        "grid gap-2 overflow-hidden",
        isMobile
          ? "grid-cols-4 grid-rows-2 h-[220px]"
          : "grid-cols-4 grid-rows-2 h-[min(420px,42vh)] rounded-2xl",
      )}
    >
      <div className={cn("relative col-span-2 row-span-2 bg-muted", !isMobile && "rounded-l-2xl overflow-hidden")}>
        <SalonCoverImg
          src={images[0]}
          seed={salon.coverSeed}
          category={salon.category}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className={cn("relative col-span-2 bg-muted", !isMobile && "overflow-hidden")}>
        <SalonCoverImg
          src={images[1]}
          seed={`${salon.coverSeed}-1`}
          category={salon.category}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className={cn("relative col-span-2 bg-muted", !isMobile && "rounded-br-2xl overflow-hidden")}>
        <SalonCoverImg
          src={images[2]}
          seed={`${salon.coverSeed}-2`}
          category={salon.category}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
