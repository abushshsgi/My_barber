import { Link, useNavigate } from "@tanstack/react-router";
import { Star, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BarberWorkPrefsSection } from "@/components/barber/BarberWorkPrefsSection";
import { SalonAmenitiesSection } from "@/components/salon/SalonAmenitiesSection";
import { useBarberPublic } from "@/hooks/use-barbers";
import { cn } from "@/lib/utils";

type Props = { barberId: string };

/** Desktop barber profil — mavjud beige UI. */
export function BarberProfileContent({ barberId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: barber, isLoading, isError } = useBarberPublic(barberId);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (isError || !barber) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-sm text-muted-foreground">{t("common.notFound", { defaultValue: "Topilmadi" })}</p>
        <Link to="/map" className="mt-4 inline-block text-sm font-bold underline">
          {t("map.title", { defaultValue: "Xarita" })}
        </Link>
      </div>
    );
  }

  const bookTo =
    barber.bookingKind === "salon" && barber.salonId
      ? `/booking/${barber.salonId}?barber=${barber.barberId}`
      : `/booking/barber/${barber.barberId}`;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-5 pb-24 pt-2">
      <div className="flex items-center gap-4">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted">
          {barber.avatar ? (
            <img src={barber.avatar} alt="" className="size-full object-cover" />
          ) : (
            <User className="size-8 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{barber.name}</h1>
          {barber.salonName ? <p className="mt-1 text-sm text-muted-foreground">{barber.salonName}</p> : null}
          {barber.rating > 0 ? (
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-bold">
              <Star className="size-4 fill-foreground" />
              {barber.rating.toFixed(1)}
              <span className="font-normal text-muted-foreground">({barber.reviewCount})</span>
            </p>
          ) : null}
        </div>
      </div>

      {barber.servicesPreview.length > 0 ? (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t("booking.selectService", { defaultValue: "Xizmatlar" })}
          </h2>
          <ul className="mt-3 space-y-2">
            {barber.servicesPreview.map((name) => (
              <li key={name} className="rounded-xl bg-surface px-4 py-3 text-sm font-medium">
                {name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {barber.bookingKind === "independent" ? (
        <BarberWorkPrefsSection workLocation={barber.workLocation} paymentMethods={barber.paymentMethods} />
      ) : null}

      {barber.amenities.length > 0 ? (
        <SalonAmenitiesSection
          amenities={barber.amenities}
          variant={barber.bookingKind === "salon" ? "solo_studio" : "salon"}
        />
      ) : null}

      <button
        type="button"
        onClick={() => void navigate({ to: bookTo })}
        className={cn("w-full rounded-2xl bg-foreground py-4 text-sm font-bold text-background")}
      >
        {t("booking.title", { defaultValue: "Band qilish" })}
      </button>
    </div>
  );
}
