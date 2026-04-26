"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { MapPin, Star, Users, Images, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatCard, SectionCard } from "@/adminhub-ui/barber/primitives";

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
          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild className="rounded-xl">
              <Link href="/salon/join">Join a salon</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/salon/create">Create a salon</Link>
            </Button>
          </div>
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
    <div className="page-container space-y-6">
      {salons.length > 1 && (
        <div>
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

      <div className="relative rounded-2xl overflow-hidden h-56 sm:h-72 bg-muted">
        {salonView.cover_image ? (
          <img src={salonView.cover_image} alt="" className="size-full object-cover" />
        ) : (
          <div className="size-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-background">
          <h1 className="text-3xl sm:text-4xl font-semibold">{salonView.name}</h1>
          <div className="mt-2 inline-flex items-center gap-1.5 text-sm opacity-90">
            <MapPin className="h-3.5 w-3.5" />
            {salonView.address}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Star className="h-4 w-4" />}
          label="Reyting"
          value={salonView.rating_avg.toFixed(1)}
          hint={`${salonView.review_count} sharh`}
        />
        <StatCard icon={<Users className="h-4 w-4" />} label="A'zolar" value={"—"} hint="Faol sartaroshlar" />
        <StatCard icon={<Images className="h-4 w-4" />} label="Galereya" value={salonView.images.length} hint="Rasmlar" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/salon-view/gallery"
          className="rounded-xl border border-border bg-card p-5 hover:border-foreground/30 transition-colors flex items-center gap-4"
        >
          <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
            <Images className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Galereyani ko‘rish</div>
            <div className="text-sm text-muted-foreground">Salon rasmlari</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          href="/salon-view/reviews"
          className="rounded-xl border border-border bg-card p-5 hover:border-foreground/30 transition-colors flex items-center gap-4"
        >
          <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
            <Star className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Salon sharhlari</div>
            <div className="text-sm text-muted-foreground">Mijozlar fikrlari</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      <SectionCard title="Manzil va aloqa">
        <p className="text-sm text-muted-foreground">{salonView.address}</p>
      </SectionCard>

      <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
        <p className="text-xs text-muted-foreground">
          This is a read-only view. Bookings and settings are managed in Independent View.
        </p>
      </div>
    </div>
  );
}
