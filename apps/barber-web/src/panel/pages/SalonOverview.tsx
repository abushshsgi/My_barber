"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { Star, MapPin, Phone } from "lucide-react";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-4 w-4 ${i <= count ? "fill-foreground text-foreground" : "text-border"}`} />
      ))}
    </div>
  );
}

export default function SalonOverview() {
  const { salons, selectedSalonId, setSelectedSalonId, salonView } = useApp();

  if (salons.length === 0) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Salon View</h1>
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">No salon connected yet.</p>
        </div>
      </div>
    );
  }

  if (!salonView) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Salon View</h1>
        {salons.length > 1 && (
          <div className="mb-4">
            <select
              value={selectedSalonId || ""}
              onChange={(e) => setSelectedSalonId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-muted text-sm outline-none focus:ring-1 focus:ring-ring"
            >
              {salons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">Loading salon…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {salons.length > 1 && (
        <div className="px-4 md:px-6 lg:px-8 pt-4">
          <select
            value={selectedSalonId || ""}
            onChange={(e) => setSelectedSalonId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-muted text-sm outline-none focus:ring-1 focus:ring-ring"
          >
            {salons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Cover */}
      <div className="relative h-48 md:h-64 bg-muted overflow-hidden">
        {salonView.cover_image ? (
          <img src={salonView.cover_image} alt={salonView.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <div className="page-container -mt-16 relative z-10 space-y-6">
        <div className="glass-card p-6">
          <h1 className="text-2xl font-bold">{salonView.name}</h1>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{salonView.address}</span>
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{salonView.phone}</span>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-3xl font-bold">{salonView.rating_avg.toFixed(1)}</span>
            <div>
              <Stars count={Math.round(salonView.rating_avg)} />
              <p className="text-xs text-muted-foreground mt-0.5">{salonView.review_count} reviews</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
          <p className="text-xs text-muted-foreground">This is a read-only view. Bookings and settings are managed in Independent View.</p>
        </div>
      </div>
    </div>
  );
}
