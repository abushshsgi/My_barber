import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ChevronRight, ImageOff } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { MorphAiSeeAllLink } from "@/components/admin/MorphAiSeeAllLink";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { fetchMorphAiGallery } from "@/lib/admin-api";
import { resolveMediaUrl } from "@/lib/media-url";

export const Route = createFileRoute("/admin/morph-ai/gallery")({
  component: MorphGalleryPage,
});

function GalleryImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 bg-muted px-3 text-center text-sm text-muted-foreground">
        <ImageOff className="size-6 opacity-60" />
        <span>Rasm fayli yo‘q</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="aspect-[3/4] w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function MorphGalleryPage() {
  const q = useQuery({
    queryKey: ["admin", "morph-ai", "gallery", "preview"],
    queryFn: () => fetchMorphAiGallery(10),
  });
  const items = (q.data?.items || []).slice(0, 10);
  const mediaNote = q.data?.media_note;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Preview gallery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Eng oxirgi 10 ta selfi — to&apos;liq gallery va yuklab olish uchun Barchasi.
          </p>
        </div>
        <Link
          to="/admin/morph-ai/list/$kind"
          params={{ kind: "gallery" }}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Barchasi
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {mediaNote ? (
        <Alert>
          <AlertTitle>Media disk</AlertTitle>
          <AlertDescription>{mediaNote}</AlertDescription>
        </Alert>
      ) : null}

      {q.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Yuklash xatosi</AlertTitle>
          <AlertDescription>
            {(q.error as Error)?.message || "Gallery ma'lumotlari olinmadi. Qayta urinib ko'ring."}
          </AlertDescription>
        </Alert>
      ) : null}

      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Gallery bo'sh" description="History yozuvlari paydo bo'lganda shu yerda." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const src = item.photo_missing ? null : resolveMediaUrl(item.photo_url);
              return (
                <figure
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
                >
                  <GalleryImage src={src} alt={item.user_name} />
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
          <MorphAiSeeAllLink kind="gallery" />
        </>
      )}
    </div>
  );
}
