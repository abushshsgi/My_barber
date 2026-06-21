import { resolveMediaUrl } from "@/lib/media-url";

export function SalonPortfolioGallery({ images }: { images: string[] }) {
  if (!images.length) return null;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((src) => {
          const url = resolveMediaUrl(src) ?? src;
          return (
            <div key={url} className="aspect-square overflow-hidden rounded-xl bg-muted">
              <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
