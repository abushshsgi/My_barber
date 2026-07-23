import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type DragEvent } from "react";
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
  Upload,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { SalonCameraCapture } from "@/components/salon/SalonCameraCapture";
import { SalonImageEnhanceDialog } from "@/components/salon/SalonImageEnhanceDialog";
import {
  isHeicLike,
  isLikelyImageFile,
  prepareSalonImageForUpload,
} from "@/lib/salon-image-enhance";
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

function mediaBasename(url: string): string {
  try {
    const path = (url.split("?")[0] || "").split("#")[0] || "";
    return decodeURIComponent(path.split("/").pop() || "").toLowerCase();
  } catch {
    return "";
  }
}

function GalleryPage() {
  const {
    salon,
    addSalonImages,
    removeSalonImage,
    setSalonCoverFromGallery,
    uploadSalonCover,
    clearSalonCover,
    isJoinedWorker,
    ownsSalon,
  } = useBarberContext();

  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraFileRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pendingEnhance, setPendingEnhance] = useState<File | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const canEdit = ownsSalon && !isJoinedWorker;
  const items = salon.galleryItems?.length
    ? salon.galleryItems
    : salon.gallery.map((image, i) => ({ id: -i - 1, image, sort_order: i }));
  const hasCover = Boolean(salon.cover);

  const filterImageFiles = (files: FileList | File[] | null): File[] => {
    if (!files) return [];
    const list = Array.from(files);
    const images = list.filter(isLikelyImageFile);
    const heic = images.filter(isHeicLike);
    if (heic.length > 0) {
      toast.message("HEIC (iPhone) rasmlari: brauzer cheklashi mumkin", {
        description: "Imkon bo‘lsa JPEG/PNG ga o‘girib yuklang.",
      });
    }
    if (images.length === 0) {
      toast.error("Faqat rasm fayllari (JPG, PNG, WebP).");
    }
    return images;
  };

  const uploadMany = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadProgress(`0 / ${files.length}`);
    try {
      const processed: File[] = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`${i + 1} / ${files.length} tayyorlanmoqda…`);
        processed.push(await prepareSalonImageForUpload(files[i]!, { preset: "natural" }));
      }
      setUploadProgress("Serverga yuklanmoqda…");
      const ok = await addSalonImages(processed);
      if (ok) toast.success(`${files.length} ta rasm qo‘shildi.`);
      else toast.error("Yuklashda xato. Internetni tekshirib qayta urinib ko‘ring.");
    } catch {
      toast.error("Rasmlarni tayyorlashda xato.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const queueFiles = (files: FileList | File[] | null) => {
    const list = filterImageFiles(files);
    if (list.length === 0) return;
    if (list.length === 1) {
      setPendingEnhance(list[0]!);
      return;
    }
    void uploadMany(list);
  };

  const onEnhanced = async (file: File) => {
    setPendingEnhance(null);
    setUploading(true);
    setUploadProgress("Yuklanmoqda…");
    try {
      const prepared = await prepareSalonImageForUpload(file, { preset: "none" });
      const ok = await addSalonImages([prepared]);
      if (ok) toast.success("Rasm qo‘shildi — mijozlar ko‘radi.");
      else toast.error("Yuklashda xato.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const uploadCoverFile = async (file: File) => {
    setCoverBusy(true);
    setUploading(true);
    setUploadProgress("Muqova tayyorlanmoqda…");
    try {
      const prepared = await prepareSalonImageForUpload(file, { preset: "natural" });
      setUploadProgress("Muqova yuklanmoqda…");
      const ok = await uploadSalonCover(prepared);
      if (ok) toast.success("Muqova yangilandi.");
      else toast.error("Muqova yuklanmadi.");
    } catch {
      toast.error("Muqovani tayyorlashda xato.");
    } finally {
      setCoverBusy(false);
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canEdit || uploading) return;
    queueFiles(e.dataTransfer.files);
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 p-3 pb-24 sm:space-y-5 sm:p-6 sm:pb-8 lg:p-8">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
            Salon
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Galereya
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {salon.name || "Salon"}
            {hasCover ? " · muqova bor" : ""}
            {" · "}
            {items.length} ta rasm
            {!canEdit && (
              <span className="mt-1 block text-xs">Siz ishchi rolidasiz — faqat ko‘rish.</span>
            )}
          </p>
        </div>

        {canEdit && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                if (typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches) {
                  cameraFileRef.current?.click();
                } else {
                  setCameraOpen(true);
                }
              }}
              className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-50 sm:size-auto sm:gap-1.5 sm:px-3.5 sm:py-2.5 sm:text-sm sm:font-medium"
              aria-label="Kamera"
            >
              <Camera className="size-4" />
              <span className="hidden sm:inline">Kamera</span>
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => galleryInputRef.current?.click()}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-foreground px-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50 sm:px-3.5 sm:py-2.5"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              <span className="sm:hidden">Qo‘shish</span>
              <span className="hidden sm:inline">Rasm qo‘shish</span>
            </button>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,.heic,.heif"
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
                if (f && isLikelyImageFile(f)) setPendingEnhance(f);
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.currentTarget.value = "";
                if (!f || !isLikelyImageFile(f)) return;
                void uploadCoverFile(f);
              }}
            />
          </div>
        )}
      </header>

      {/* Muqova — har doim ko‘rinadi (yuklangandan keyin preview + o‘chirish/almashtirish) */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-3 py-2.5 sm:px-4">
          <h2 className="text-sm font-semibold text-foreground">Muqova rasmi</h2>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            Qidiruv va salon sahifasidagi asosiy foto
          </p>
        </div>

        {hasCover ? (
          <>
            <div className="relative aspect-[16/10] w-full bg-muted sm:aspect-[21/9]">
              <img
                src={salon.cover}
                alt="Salon muqovasi"
                className="size-full object-cover"
              />
            </div>
            {canEdit && (
              <div className="flex gap-2 border-t border-border p-2.5 sm:p-3">
                <button
                  type="button"
                  disabled={uploading || coverBusy}
                  onClick={() => coverInputRef.current?.click()}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  <RefreshCw className="size-4" />
                  Almashtirish
                </button>
                <button
                  type="button"
                  disabled={uploading || coverBusy}
                  onClick={async () => {
                    if (!confirm("Muqova rasmini o‘chirasizmi?")) return;
                    setCoverBusy(true);
                    const ok = await clearSalonCover();
                    setCoverBusy(false);
                    if (ok) toast.success("Muqova o‘chirildi.");
                    else toast.error("O‘chirishda xato.");
                  }}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-destructive hover:bg-muted disabled:opacity-50"
                >
                  {coverBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  O‘chirish
                </button>
              </div>
            )}
          </>
        ) : canEdit ? (
          <button
            type="button"
            disabled={uploading || coverBusy}
            onClick={() => coverInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 px-4 py-10 text-center transition-colors hover:bg-muted/40 disabled:opacity-50 sm:py-12"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
              {coverBusy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ImagePlus className="size-5 text-foreground" />
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Muqova yuklash</p>
              <p className="text-xs text-muted-foreground">JPG, PNG yoki WebP · avtomatik siqiladi</p>
            </div>
          </button>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Muqova hali yuklanmagan
          </div>
        )}
      </section>

      {canEdit && (
        <section
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "relative hidden overflow-hidden rounded-2xl border-2 border-dashed transition-colors sm:block",
            dragOver
              ? "border-foreground bg-foreground/[0.04]"
              : "border-border bg-gradient-to-b from-muted/40 to-card",
            uploading && "pointer-events-none opacity-70",
          )}
        >
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center sm:py-12">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-background shadow-sm ring-1 ring-border">
              {uploading ? (
                <Loader2 className="size-6 animate-spin text-foreground" />
              ) : (
                <Upload className="size-6 text-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <p className="font-heading text-lg font-semibold text-foreground">
                {uploading ? "Yuklanmoqda…" : "Rasmlarni shu yerga tashlang"}
              </p>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                {uploadProgress ||
                  "Yoki galereyadan tanlang. Rasmlar avtomatik siqiladi va mijozlarga ko‘rinadi."}
              </p>
            </div>
            {!uploading && (
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background"
              >
                <ImagePlus className="size-4" />
                Fayl tanlash
              </button>
            )}
          </div>
        </section>
      )}

      {canEdit && uploading && uploadProgress && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground sm:hidden">
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          {uploadProgress}
        </div>
      )}

      {canEdit && (
        <Link
          to="/barber/salon-view/edit"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-foreground/25 sm:p-4"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Images className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Salon maʼlumotlari</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Nom, manzil, telefonni tahrirlash
            </div>
          </div>
        </Link>
      )}

      <div className="space-y-2.5">
        <h2 className="px-0.5 text-sm font-semibold text-foreground">Galereya rasmlari</h2>

        {items.length === 0 ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-10 text-center sm:px-6 sm:py-14">
            <Images className="mx-auto size-8 text-muted-foreground sm:size-9" />
            <div className="space-y-1">
              <p className="font-heading text-base font-medium sm:text-lg">Hali rasm yo‘q</p>
              <p className="mx-auto max-w-sm text-xs text-muted-foreground sm:text-sm">
                Interyer va ish namunalarini qo‘shing — mijozlar ko‘rgandan keyin bron qiladi.
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background"
              >
                <Plus className="size-4" />
                Birinchi rasmni qo‘shish
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {items.map((item) => {
              const coverBase = mediaBasename(salon.cover);
              const itemBase = mediaBasename(item.image);
              const isCover =
                Boolean(salon.cover) &&
                (salon.cover === item.image ||
                  (coverBase !== "" && coverBase === itemBase));
              return (
                <div
                  key={item.id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted sm:rounded-2xl"
                >
                  <img
                    src={item.image}
                    alt=""
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/75 via-transparent to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" />
                  {isCover && (
                    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-lg bg-background/95 px-1.5 py-0.5 text-[10px] font-medium shadow-sm sm:left-2 sm:top-2 sm:px-2">
                      <Star className="size-3 fill-current" />
                      Muqova
                    </span>
                  )}
                  {canEdit && item.id > 0 && (
                    <div className="absolute inset-x-1.5 bottom-1.5 flex gap-1 opacity-100 transition-opacity sm:inset-x-2 sm:bottom-2 sm:gap-1.5 sm:opacity-0 sm:group-hover:opacity-100">
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
                          "inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-background/95 text-[10px] font-medium sm:h-9 sm:rounded-xl sm:text-[11px]",
                          isCover && "opacity-60",
                        )}
                      >
                        {isCover ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <Star className="size-3" />
                        )}
                        {isCover ? "Muqova" : "Muqova qil"}
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
                        className="inline-flex size-8 items-center justify-center rounded-lg bg-background/95 text-destructive sm:size-9 sm:rounded-xl"
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
      </div>

      {canEdit && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-heading inline-flex items-center gap-2 text-sm font-semibold sm:text-base">
            <Sparkles className="size-4" />
            Foto tavsiyalari
          </h2>
          <ul className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            {TIPS.map((tip, i) => (
              <li
                key={tip}
                className={cn(
                  "flex gap-2 rounded-xl bg-muted/40 px-3 py-2.5 leading-relaxed",
                  i >= 3 && "hidden sm:flex",
                )}
              >
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 sm:hidden" />
                <span>{tip}</span>
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
