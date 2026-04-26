"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { useState } from "react";
import { EmptyState } from "@/panel/components/EmptyState";
import { Image as ImageIcon, Plus } from "lucide-react";

export default function SalonGallery() {
  const { salons, salonView } = useApp();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (salons.length === 0) {
    return (
      <div className="page-container space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
        <EmptyState
          icon={ImageIcon}
          title="No salon connected"
          description="Salon View ishlashi uchun avval salonga ulangan bo‘lishingiz kerak."
        />
      </div>
    );
  }

  if (!salonView) {
    return (
      <div className="page-container space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">Loading salon…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Galereya</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {salonView.name} — {salonView.images.length} ta rasm
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
          title="Upload API kerak (UI-only)"
        >
          <Plus className="h-4 w-4" />
          Rasm qo'shish
        </button>
      </div>

      {salonView.images.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No photos yet"
          description="Salonda hali rasmlar yo‘q."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {salonView.images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedImage(img)}
              className="aspect-square rounded-xl overflow-hidden bg-muted relative group"
            >
              <img
                src={img}
                alt={`Gallery ${i + 1}`}
                className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} alt="Full size" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
