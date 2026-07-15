import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Plus,
  Camera,
  Images,
  Trash2,
  Star,
  Sparkles,
  Loader2,
  Lightbulb,
  ImagePlus,
} from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { SalonCameraCapture } from "@/components/salon/SalonCameraCapture";
import { SalonImageEnhanceDialog } from "@/components/salon/SalonImageEnhanceDialog";
import { enhanceImageFile } from "@/lib/salon-image-enhance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/barber/salon-view/gallery")({
  component: GalleryPage,
});

const TIPS = [
  "Kamida 6–10 ta rasm qo‘ying: fasad, qabulxona, kreslo, ish namunasi.",
  "Yon yorug‘lik bilan oling — telefon fleshini to‘g‘ridan-to‘g‘ri yoqmang.",
  "Horizont tekis, tartibli joy — mijoz tozalikka e’tibor beradi.",
  "Eng yaxshi rasmni muqova (cover) qiling — u qidiruv kartasida chiqadi.",
  "Bir xil uslubdagi rasmlar brendni kuchaytiradi.",
];

function GalleryPage() {
  const {
    salon,
    addSalonImages,
    removeSalonImage,
    setSalonCoverFromGallery,
    uploadSalonCover,
    isJoinedWorker,
    ownsSalon,
  } = useBarberContext();

  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraFileRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pendingEnhance, setPendingEnhance] = useState<File | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const canEdit = ownsSalon && !isJoinedWorker;
  const items = salon.galleryItems?.length
    ? salon.galleryItems
    : salon.gallery.map((image, i) => ({ id: -i - 1, image, sort_order: i }));

  const queueFiles = (files: FileList | File[] | null) => {
    if (!files || (Array.isArray(files) ? files.length === 0 : files.length === 0)) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      toast.error("Faqat rasm fayllari.");
      return;
    }
    // Enhance first file interactively; rest upload as-is (or with natural preset later)
    if (list.length === 1) {
      setPendingEnhance(list[0]!);
      return;
    }
    void uploadMany(list);
  };

  const uploadMany = async (files: File[]) => {
    setUploading(true);
    try {
      const processed = await Promise.all(
        files.map((f) => enhanceImageFile(f, { preset: "natural" })),
      );
      const ok = await addSalonImages(processed);
      if (ok) toast.success(`${files.length} ta rasm qo‘shildi (avtomatik yaxshilandi).`);
      else toast.error("Yuklashda xato.");
    } catch {
      toast.error("Rasmlarni tayyorlashda xato.");
    } finally {
      setUploading(false);
    }
  };

  const onEnhanced = async (file: File) => {
    setPendingEnhance(null);
    setUploading(true);
    const ok = await addSalonImages([file]);
    setUploading(false);
    if (ok) toast.success("Rasm qo‘shildi.");
    else toast.error("Yuklashda xato.");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-foreground">Galereya</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {salon.name || "Salon"} — {items.length} ta rasm
            {!canEdit && (
              <span className="block text-xs mt-1">Siz ishchi rolidasiz — faqat ko‘rish.</span>
            )}
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => setCameraOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <Camera className="size-4" />
              Kamera
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => cameraFileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted disabled:opacity-50 sm:hidden"
            >
              <Camera className="size-4" />
              Telefon kamera
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => galleryInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Bir nechta rasm
            </button>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                queueFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={cameraFileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPendingEnhance(f);
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.currentTarget.value = "";
                if (!f) return;
                setUploading(true);
                const ok = await uploadSalonCover(f);
                setUploading(false);
                if (ok) toast.success("Muqova yangilandi.");
                else toast.error("Muqova yuklanmadi.");
              }}
            />
          </div>
        )}
      </div>

      {canEdit && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="rounded-xl border border-border bg-card p-4 text-left hover:border-foreground/30 transition-colors flex items-start gap-3"
          >
            <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <ImagePlus className="size-4" />
            </div>
            <div>
              <div className="font-medium text-sm">Muqova rasmi</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Qidiruv va salon sahifasidagi asosiy foto
              </div>
            </div>
          </button>
          <Link
            to="/barber/salon-view/edit"
            className="rounded-xl border border-border bg-card p-4 hover:border-foreground/30 transition-colors flex items-start gap-3"
          >
            <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Images className="size-4" />
            </div>
            <div>
              <div className="font-medium text-sm">Salon maʼlumotlari</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Nom, manzil, telefonni tahrirlash
              </div>
            </div>
          </Link>
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 flex items-start gap-3">
            <Lightbulb className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {TIPS[Math.min(items.length, TIPS.length - 1)]}
            </p>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center space-y-3">
          <Images className="size-8 mx-auto text-muted-foreground" />
          <p className="font-heading text-lg font-medium">Hali rasm yo‘q</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Interyer va ish namunalarini qo‘shing — mijozlar ko‘rgandan keyin bron qiladi.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium"
            >
              <Plus className="size-4" />
              Rasm qo‘shish
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => {
            const isCover =
              Boolean(salon.cover) &&
              (salon.cover === item.image || salon.cover.includes(item.image.split("/").pop() || "___"));
            return (
              <div
                key={item.id}
                className="aspect-square rounded-xl overflow-hidden bg-muted relative group border border-border"
              >
                <img
                  src={item.image}
                  alt=""
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {isCover && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-medium">
                    <Star className="size-3 fill-current" />
                    Muqova
                  </span>
                )}
                {canEdit && item.id > 0 && (
                  <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={async () => {
                        setBusyId(item.id);
                        const ok = await setSalonCoverFromGallery(item.id);
                        setBusyId(null);
                        if (ok) toast.success("Muqova qilindi.");
                        else toast.error("Muqova o‘zgarmadi.");
                      }}
                      className={cn(
                        "flex-1 h-8 rounded-lg bg-background/95 text-[11px] font-medium inline-flex items-center justify-center gap-1",
                        isCover && "opacity-60",
                      )}
                    >
                      <Star className="size-3" />
                      Muqova
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={async () => {
                        if (!confirm("Bu rasmni o‘chirasizmi?")) return;
                        setBusyId(item.id);
                        const ok = await removeSalonImage(item.id);
                        setBusyId(null);
                        if (ok) toast.success("O‘chirildi.");
                        else toast.error("O‘chirishda xato.");
                      }}
                      className="size-8 rounded-lg bg-background/95 inline-flex items-center justify-center text-destructive"
                      aria-label="O‘chirish"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-heading text-base font-semibold inline-flex items-center gap-2">
            <Sparkles className="size-4" />
            Foto tavsiyalari
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            {TIPS.map((tip) => (
              <li key={tip} className="rounded-lg bg-muted/40 px-3 py-2 leading-relaxed">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <SalonCameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => setPendingEnhance(file)}
      />

      {pendingEnhance && (
        <SalonImageEnhanceDialog
          file={pendingEnhance}
          open
          onClose={() => setPendingEnhance(null)}
          onConfirm={(file) => void onEnhanced(file)}
        />
      )}
    </div>
  );
}
