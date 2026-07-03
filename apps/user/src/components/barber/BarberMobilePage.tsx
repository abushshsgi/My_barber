import { Link, useNavigate } from "@tanstack/react-router";
import { Star, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BarberWorkPrefsSection } from "@/components/barber/BarberWorkPrefsSection";
import { MobilePageShell } from "@/components/mobile/MobilePageShell";
import { MobileStickyActionBar } from "@/components/mobile/MobileStickyActionBar";
import { SalonAmenitiesSection } from "@/components/salon/SalonAmenitiesSection";
import { useBarberPublic } from "@/hooks/use-barbers";
import { cn } from "@/lib/utils";

type Props = { barberId: string };

export function BarberMobilePage({ barberId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: barber, isLoading, isError } = useBarberPublic(barberId);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (isError || !barber) {
    return (
      <MobilePageShell title={t("common.notFound", { defaultValue: "Topilmadi" })} backTo="/map">
        <p className="text-sm text-muted-foreground">{t("map.title", { defaultValue: "Xarita" })}</p>
        <Link to="/map" className="neo-cta mt-4 inline-flex bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          {t("map.title", { defaultValue: "Xarita" })}
        </Link>
      </MobilePageShell>
    );
  }

  const bookTo =
    barber.bookingKind === "salon" && barber.salonId
      ? `/booking/${barber.salonId}?barber=${barber.barberId}`
      : `/booking/barber/${barber.barberId}`;

  return (
    <>
      <MobilePageShell title={barber.name} subtitle={barber.salonName ?? undefined} backTo="/map">
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="neo-panel grid size-20 shrink-0 place-items-center overflow-hidden p-0">
              {barber.avatar ? (
                <img src={barber.avatar} alt="" className="size-full object-cover" />
              ) : (
                <User className="size-8 text-muted-foreground" />
              )}
            </div>
            {barber.rating > 0 ? (
              <p className="inline-flex items-center gap-1 text-sm font-bold">
                <Star className="size-4 fill-primary text-primary" />
                {barber.rating.toFixed(1)}
                <span className="font-normal text-muted-foreground">({barber.reviewCount})</span>
              </p>
            ) : null}
          </div>

          {barber.servicesPreview.length > 0 ? (
            <div>
              <p className="label-eyebrow">{t("booking.selectService", { defaultValue: "Xizmatlar" })}</p>
              <ul className="mt-2 space-y-2">
                {barber.servicesPreview.map((name) => (
                  <li key={name} className="neo-panel px-4 py-3 text-sm font-semibold shadow-soft">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {barber.bookingKind === "independent" ? (
            <BarberWorkPrefsSection
              workLocation={barber.workLocation}
              paymentMethods={barber.paymentMethods}
            />
          ) : null}

          {barber.amenities.length > 0 ? (
            <SalonAmenitiesSection
              amenities={barber.amenities}
              variant={barber.bookingKind === "salon" ? "solo_studio" : "salon"}
            />
          ) : null}
        </div>
      </MobilePageShell>

      <MobileStickyActionBar>
        <button
          type="button"
          onClick={() => void navigate({ to: bookTo })}
          className={cn("neo-cta w-full bg-primary py-3.5 text-sm font-bold text-primary-foreground")}
        >
          {t("booking.title", { defaultValue: "Band qilish" })}
        </button>
      </MobileStickyActionBar>
    </>
  );
}
