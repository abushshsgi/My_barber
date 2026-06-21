import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { formatPrice } from "@/lib/mock-data";
import { SalonAmenitiesSection } from "@/components/salon/SalonAmenitiesSection";
import { SalonBookingCalendar } from "@/components/salon/SalonBookingCalendar";
import { SalonHoursSection } from "@/components/salon/SalonHoursSection";
import { SalonLocationSection } from "@/components/salon/SalonLocationSection";
import { SalonPortfolioGallery } from "@/components/salon/SalonPortfolioGallery";
import { SalonReviewsList } from "@/components/salon/SalonReviewsList";
import { SalonReviewsSummary } from "@/components/salon/SalonReviewsSummary";

export function SalonPageSections({
  salon,
  calendarMonths = 1,
}: {
  salon: Salon;
  calendarMonths?: 1 | 2;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">{t("salon.tabs.about")}</h2>
        <p className="text-sm leading-relaxed sm:text-base">{salon.about}</p>
      </section>

      <SalonAmenitiesSection amenities={salon.amenities} />

      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">{t("salon.tabs.services")}</h2>
        <div className="divide-y divide-border">
          {salon.services.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold">{s.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.duration} {t("salon.minutes")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold">{formatPrice(s.price)}</span>
                <Link
                  to="/booking/$salonId"
                  params={{ salonId: salon.id }}
                  className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background"
                >
                  <Plus className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {salon.staff.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">{t("salon.tabs.staff")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {salon.staff.map((b) => (
              <div key={b.id} className="rounded-2xl bg-surface p-4 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-foreground text-lg font-bold text-background">
                  {b.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <p className="mt-3 text-sm font-bold">{b.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{b.role}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight">{t("salon.tabs.reviews")}</h2>
        <SalonReviewsSummary summary={salon.ratingSummary} />
        <SalonReviewsList reviews={salon.reviews} />
      </section>

      <SalonLocationSection
        address={salon.address}
        lat={salon.lat}
        lng={salon.lng}
        salonId={salon.id}
      />

      <SalonHoursSection hours={salon.hours} closedWeekdays={salon.closedWeekdays} />

      <SalonBookingCalendar salonId={salon.id} months={calendarMonths} />

      {salon.portfolio.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">{t("salon.tabs.portfolio")}</h2>
          <SalonPortfolioGallery images={salon.portfolio} />
        </section>
      ) : null}
    </div>
  );
}
