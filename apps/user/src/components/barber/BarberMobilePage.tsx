import { Link, useNavigate } from "@tanstack/react-router";
import { Star, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BarberWorkPrefsSection } from "@/components/barber/BarberWorkPrefsSection";
import { MobilePageShell } from "@/components/mobile/MobilePageShell";
import { MobileStickyActionBar } from "@/components/mobile/MobileStickyActionBar";
import { SalonAmenitiesSection } from "@/components/salon/SalonAmenitiesSection";
import { useBarberPublic } from "@/hooks/use-barbers";
import { MOBILE_STICKY_CONTENT_PADDING_CLASS } from "@/lib/layout-constants";
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
      <MobilePageShell flush title={t("common.notFound", { defaultValue: "Topilmadi" })} backTo="/map">
        <div className="px-4 pt-4">
          <p className="text-sm text-muted-foreground">{t("map.title", { defaultValue: "Xarita" })}</p>
          <Link
            to="/map"
            className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            {t("map.title", { defaultValue: "Xarita" })}
          </Link>
        </div>
      </MobilePageShell>
    );
  }

  const bookTo =
    barber.bookingKind === "salon" && barber.salonId
      ? `/booking/${barber.salonId}?barber=${barber.barberId}`
      : `/booking/barber/${barber.barberId}`;

  return (
    <>
      <MobilePageShell
        flush
        title={barber.name}
        subtitle={barber.salonName ?? undefined}
        backTo="/map"
        className={MOBILE_STICKY_CONTENT_PADDING_CLASS}
      >
        <div className="space-y-4 px-4 pt-3">
          <div className="flex items-center gap-3">
            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
              {barber.avatar ? (
                <img src={barber.avatar} alt="" className="size-full object-cover" />
              ) : (
                <User className="size-6 text-muted-foreground" />
              )}
            </div>
            {barber.rating > 0 ? (
              <p className="inline-flex items-center gap-1 text-sm font-semibold">
                <Star className="size-3.5 fill-foreground text-foreground" />
                {barber.rating.toFixed(1)}
                <span className="font-normal text-muted-foreground">({barber.reviewCount})</span>
              </p>
            ) : null}
          </div>

          {barber.servicesPreview.length > 0 ? (
            <div>
              <p className="text-sm font-semibold">{t("booking.selectService", { defaultValue: "Xizmatlar" })}</p>
              <ul className="mt-1.5 divide-y divide-border">
                {barber.servicesPreview.map((name) => (
                  <li key={name} className="py-2.5 text-sm font-medium">
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
              compact
            />
          ) : null}
        </div>
      </MobilePageShell>

      <MobileStickyActionBar>
        <button
          type="button"
          onClick={() => void navigate({ to: bookTo })}
          className={cn("w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground")}
        >
          {t("booking.title", { defaultValue: "Band qilish" })}
        </button>
      </MobileStickyActionBar>
    </>
  );
}
