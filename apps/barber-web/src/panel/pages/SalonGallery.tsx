"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { useState } from "react";
import { EmptyState } from "@/panel/components/EmptyState";
import { Image as ImageIcon } from "lucide-react";

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
        <p className="text-muted-foreground text-sm mt-1">{salonView.name}</p>
      </div>

      {salonView.images.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No photos yet"
          description="Salonda hali rasmlar yo‘q."
        />
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {salonView.images.map((img, i) => (
          <button
            key={i}
            onClick={() => setSelectedImage(img)}
            className="aspect-square rounded-xl overflow-hidden bg-muted group relative"
          >
            <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
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
