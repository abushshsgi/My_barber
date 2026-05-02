import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Plus } from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { toast } from "sonner";

export const Route = createFileRoute("/barber/salon-view/gallery")({
  component: GalleryPage,
});

function GalleryPage() {
  const { salon, addSalonImage, isJoinedWorker } = useBarberContext();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-foreground">Galereya</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {salon.name} — {salon.gallery.length} ta rasm
            {isJoinedWorker && (
              <span className="block text-xs mt-1">
                Siz ishchi rolidasiz — rasm qoʻsha olmaysiz.
              </span>
            )}
          </p>
        </div>
        {!isJoinedWorker && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
            >
              <Plus className="size-4" />
              Rasm qo'shish
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const ok = await addSalonImage({ file });
                if (ok) toast.success("Rasm qo'shildi.");
                else toast.error("Rasm yuklashda xato.");
                e.currentTarget.value = "";
              }}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {salon.gallery.map((src, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl overflow-hidden bg-muted relative group cursor-pointer"
          >
            <img
              src={src}
              alt=""
              className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
}
