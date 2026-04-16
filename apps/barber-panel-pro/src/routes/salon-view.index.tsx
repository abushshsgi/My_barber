import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/topbar";
import { useBarberStore } from "@/lib/barber-store";
import { mockReviews } from "@/lib/mock-data";
import { Star, MapPin, Phone } from "lucide-react";

export const Route = createFileRoute("/salon-view/")({
  component: SalonViewPage,
});

function SalonViewPage() {
  const { salons, selectedSalonId, setSelectedSalonId } = useBarberStore();
  const salon = salons.find((s) => s.id === selectedSalonId) ?? salons[0];

  if (!salon) {
    return (
      <>
        <Topbar title="Salon View" />
        <div className="flex items-center justify-center p-16">
          <div className="text-center">
            <p className="text-sm font-medium">No salon yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">You haven't been added to any salon.</p>
          </div>
        </div>
      </>
    );
  }

  const avg = mockReviews.reduce((s, r) => s + r.rating, 0) / mockReviews.length;

  return (
    <>
      <Topbar title="Salon View" />
      <div className="p-6">
        {salons.length > 1 && (
          <select
            value={selectedSalonId ?? ""}
            onChange={(e) => setSelectedSalonId(e.target.value)}
            className="mb-6 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          >
            {salons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {/* Cover */}
        <div className="relative h-48 overflow-hidden rounded-xl bg-muted">
          <img src={salon.coverImage} alt={salon.name} className="h-full w-full object-cover" />
        </div>

        {/* Info */}
        <div className="mt-6">
          <h2 className="text-display text-2xl font-semibold tracking-tight">{salon.name}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
              {salon.address}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
              {salon.phone}
            </span>
          </div>
        </div>

        {/* Rating */}
        <div className="mt-6 flex items-center gap-4 rounded-xl border border-border p-5">
          <span className="text-display text-4xl font-semibold">{avg.toFixed(1)}</span>
          <div>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < Math.round(avg) ? "fill-foreground text-foreground" : "text-border"}`}
                  strokeWidth={1.5}
                />
              ))}
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">{salon.reviewCount} reviews</p>
          </div>
        </div>

        {/* Quick gallery preview */}
        <div className="mt-6">
          <h3 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Gallery</h3>
          <div className="grid grid-cols-3 gap-3">
            {salon.images.slice(0, 3).map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-xl bg-muted">
                <img src={img} alt="" className="h-full w-full object-cover transition-transform hover:scale-105" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
