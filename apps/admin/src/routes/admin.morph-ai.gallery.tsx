import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { EmptyState } from "@/components/admin/EmptyState";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { fetchMorphAiGallery } from "@/lib/admin-api";
import { API_BASE } from "@/lib/api";

export const Route = createFileRoute("/admin/morph-ai/gallery")({
  component: MorphGalleryPage,
});

function photoSrc(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

function MorphGalleryPage() {
  const q = useQuery({
    queryKey: ["admin", "morph-ai", "gallery"],
    queryFn: () => fetchMorphAiGallery(48),
  });
  const items = q.data?.items || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Preview gallery</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Foydalanuvchi AI Style tarixidagi selfilar (admin review)
        </p>
      </div>
      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Gallery bo'sh" description="History yozuvlari paydo bo'lganda shu yerda." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const src = photoSrc(item.photo_url);
            return (
              <figure
                key={item.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              >
                {src ? (
                  <img src={src} alt="" className="aspect-[3/4] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center bg-muted text-sm text-muted-foreground">
                    Rasm yo'q
                  </div>
                )}
                <figcaption className="space-y-1 p-3">
                  <div className="truncate text-sm font-medium">{item.user_name}</div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{item.source}</Badge>
                    {item.face_shape_key ? (
                      <Badge variant="outline">{item.face_shape_key}</Badge>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(item.created_at), "dd.MM.yyyy HH:mm")}
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}
