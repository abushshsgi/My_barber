import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MapPin,
  Star,
  Users,
  Images,
  ArrowRight,
  Pencil,
  Phone,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBarberContext } from "@/components/barber/BarberContext";

const PLACEHOLDER_COVER = "/placeholder-salon.svg";

export const Route = createFileRoute("/barber/salon-view/")({
  component: SalonViewPage,
});

function SalonViewPage() {
  const { salon, isJoinedWorker, ownsSalon, activationHydrated } = useBarberContext();
  const rating = Number.isFinite(salon.rating) ? salon.rating : 0;
  const coverSrc = salon.cover?.trim() ? salon.cover : PLACEHOLDER_COVER;
  const salonName = salon.name?.trim() || "Salon";
  const salonAddress = salon.address?.trim() || "Manzil kiritilmagan";
  const canEdit = ownsSalon && !isJoinedWorker;

  if (!activationHydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="relative rounded-2xl overflow-hidden h-56 sm:h-72 bg-muted">
        <img
          src={coverSrc}
          alt={salonName}
          className="size-full object-cover"
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER_COVER;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-background">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl font-semibold">{salonName}</h1>
              <div className="mt-2 inline-flex items-center gap-1.5 text-sm opacity-90">
                <MapPin className="size-3.5 shrink-0" />
                {salonAddress}
              </div>
            </div>
            {canEdit && (
              <Link
                to="/barber/salon-view/edit"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-background/15 backdrop-blur px-3 py-2 text-sm font-medium hover:bg-background/25"
              >
                <Pencil className="size-3.5" />
                Tahrirlash
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat
          icon={<Star className="size-4" />}
          label="Reyting"
          value={rating.toFixed(1)}
          hint={`${salon.reviews_count ?? 0} sharh`}
        />
        <Stat
          icon={<Users className="size-4" />}
          label="A'zolar"
          value={String(salon.members ?? 0)}
          hint="Faol sartaroshlar"
        />
        <Stat
          icon={<Images className="size-4" />}
          label="Galereya"
          value={String(salon.gallery?.length ?? 0)}
          hint="Rasmlar"
        />
      </div>

      <div
        className={cn(
          "grid gap-3",
          canEdit
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : isJoinedWorker
              ? "grid-cols-1 sm:grid-cols-3"
              : "grid-cols-1 sm:grid-cols-2",
        )}
      >
        {canEdit && (
          <Link
            to="/barber/salon-view/edit"
            className="rounded-xl border border-border bg-card p-5 hover:border-foreground/30 transition-colors flex items-center gap-4"
          >
            <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
              <Pencil className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Salonni tahrirlash</div>
              <div className="text-sm text-muted-foreground">Nom, manzil, telefon, tavsif</div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        )}
        <Link
          to="/barber/salon-view/gallery"
          className="rounded-xl border border-border bg-card p-5 hover:border-foreground/30 transition-colors flex items-center gap-4"
        >
          <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
            <Images className="size-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">
              {canEdit ? "Galereyani boshqarish" : "Galereyani koʻrish"}
            </div>
            <div className="text-sm text-muted-foreground">
              {canEdit
                ? "Bir nechta rasm, kamera, muqova, yaxshilash"
                : "Faqat ko‘rish rejimi"}
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
        {isJoinedWorker && (
          <Link
            to="/barber/salon-view/members"
            className="rounded-xl border border-border bg-card p-5 hover:border-foreground/30 transition-colors flex items-center gap-4"
          >
            <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
              <Users className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Jamoa</div>
              <div className="text-sm text-muted-foreground">Salondagi sartaroshlar roʻyxati</div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        )}
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

      <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">Manzil va aloqa</h2>
          {canEdit && (
            <Link
              to="/barber/salon-view/edit"
              className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Pencil className="size-3" />
              O‘zgartirish
            </Link>
          )}
        </div>
        <div className="space-y-3 text-sm">
          <p className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="size-4 mt-0.5 shrink-0" />
            <span>{salonAddress}</span>
          </p>
          {salon.phone?.trim() ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-4 shrink-0" />
              {salon.phone}
            </p>
          ) : null}
          {salon.description?.trim() ? (
            <p className="flex items-start gap-2 text-muted-foreground">
              <FileText className="size-4 mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap">{salon.description}</span>
            </p>
          ) : canEdit ? (
            <p className="text-xs text-muted-foreground">
              Tavsif hali yo‘q — mijozlarga salon haqida 2–3 jumla yozing.
            </p>
          ) : null}
        </div>
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
