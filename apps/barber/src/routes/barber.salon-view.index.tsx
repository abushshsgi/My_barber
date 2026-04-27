import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Star, Users, Images, ArrowRight } from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";

export const Route = createFileRoute("/barber/salon-view/")({
  component: SalonViewPage,
});

function SalonViewPage() {
  const { salon } = useBarberContext();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Cover */}
      <div className="relative rounded-2xl overflow-hidden h-56 sm:h-72 bg-muted">
        <img src={salon.cover} alt="" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-background">
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold">{salon.name}</h1>
          <div className="mt-2 inline-flex items-center gap-1.5 text-sm opacity-90">
            <MapPin className="size-3.5" />
            {salon.address}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={<Star className="size-4" />} label="Reyting" value={salon.rating.toFixed(1)} hint={`${salon.reviews_count} sharh`} />
        <Stat icon={<Users className="size-4" />} label="A'zolar" value={salon.members.toString()} hint="Faol sartaroshlar" />
        <Stat icon={<Images className="size-4" />} label="Galereya" value={salon.gallery.length.toString()} hint="Rasmlar" />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/barber/salon-view/gallery"
          className="rounded-xl border border-border bg-card p-5 hover:border-foreground/30 transition-colors flex items-center gap-4"
        >
          <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
            <Images className="size-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Galereyani boshqarish</div>
            <div className="text-sm text-muted-foreground">Rasmlarni qo'shing yoki o'chiring</div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
        <Link
          to="/barber/salon-view/reviews"
          className="rounded-xl border border-border bg-card p-5 hover:border-foreground/30 transition-colors flex items-center gap-4"
        >
          <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
            <Star className="size-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Salon sharhlari</div>
            <div className="text-sm text-muted-foreground">Mijozlar fikrlari</div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Address card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-heading text-lg font-semibold mb-3">Manzil va aloqa</h2>
        <p className="text-sm text-muted-foreground">{salon.address}</p>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="mt-2 font-heading text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}
