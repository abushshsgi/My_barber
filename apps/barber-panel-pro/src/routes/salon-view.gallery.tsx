import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/topbar";
import { useBarberStore } from "@/lib/barber-store";

export const Route = createFileRoute("/salon-view/gallery")({
  component: SalonGalleryPage,
});

function SalonGalleryPage() {
  const { salons, selectedSalonId } = useBarberStore();
  const salon = salons.find((s) => s.id === selectedSalonId) ?? salons[0];

  if (!salon) return null;

  return (
    <>
      <Topbar title="Gallery" />
      <div className="p-6">
        <div className="grid grid-cols-3 gap-3">
          {salon.images.map((img, i) => (
            <div key={i} className="group aspect-square overflow-hidden rounded-xl bg-muted cursor-pointer">
              <img
                src={img}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
