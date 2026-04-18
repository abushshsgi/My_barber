"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { useState } from "react";

export default function SalonGallery() {
  const { salons, selectedSalonId } = useApp();
  const salon = salons.find((s) => s.id === selectedSalonId) || salons[0];
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!salon) return null;

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
        <p className="text-muted-foreground text-sm mt-1">{salon.name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {salon.images.map((img, i) => (
          <button
            key={i}
            onClick={() => setSelectedImage(img)}
            className="aspect-square rounded-xl overflow-hidden bg-muted group relative"
          >
            <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          </button>
        ))}
      </div>

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
