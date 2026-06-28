import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { formatPrice } from "@/lib/mock-data";
import {
  groupSalonServicesByBarber,
  resolveDefaultSalonBarberId,
  resolveDefaultServiceIdsForBarber,
} from "@/lib/salon-services";
import { SalonAmenitiesSection } from "@/components/salon/SalonAmenitiesSection";
import { SalonBookingCalendar } from "@/components/salon/SalonBookingCalendar";
import { SalonHoursSection } from "@/components/salon/SalonHoursSection";
import { SalonLocationSection } from "@/components/salon/SalonLocationSection";
import { SalonPortfolioGallery } from "@/components/salon/SalonPortfolioGallery";
import { SalonReviewsSection } from "@/components/salon/SalonReviewsSection";
import { cn } from "@/lib/utils";

function defaultCalendarBarberId(salon: Salon) {
  return resolveDefaultSalonBarberId(salon.staff) ?? salon.staff[0]?.id;
}

function SectionBlock({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-36 space-y-5 border-b border-border pb-10", className)}>
      {title ? <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2> : null}
      {children}
    </section>
  );
}

export function SalonPageSections({
  salon,
  calendarMonths = 1,
  showCalendar = true,
  reviewsAreMock = false,
}: {
  salon: Salon;
  calendarMonths?: 1 | 2;
  showCalendar?: boolean;
  reviewsAreMock?: boolean;
}) {
  const { t } = useTranslation();
  const serviceGroups = groupSalonServicesByBarber(salon.services);
  const ownerBarberId = salon.ownerId ?? resolveDefaultSalonBarberId(salon.staff) ?? undefined;
  const calendarBarberId = defaultCalendarBarberId(salon);
  const calendarServiceIds = resolveDefaultServiceIdsForBarber(salon.services, calendarBarberId);

  return (
    <div className="space-y-0">
      <SectionBlock id="salon-about" title={t("salon.tabs.about")}>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{salon.about}</p>
      </SectionBlock>

      {salon.amenities.length > 0 ? (
        <div id="salon-amenities" className="scroll-mt-36 border-b border-border pb-10">
          <SalonAmenitiesSection
            amenities={salon.amenities}
            variant={salon.venueKind === "salon" ? "salon" : "solo_studio"}
          />
        </div>
      ) : null}

      <SectionBlock id="salon-services" title={t("salon.tabs.services")}>
        <div className="space-y-6">
          {serviceGroups.map((group) => {
            const bookingBarberId = group.barberId ?? ownerBarberId;
            const groupTitle = group.barberId
              ? group.barberName ?? t("salon.staff.title", { defaultValue: "Usta" })
              : t("salon.services.salonCatalog", { defaultValue: "Salon xizmatlari" });
            return (
              <div key={group.barberId ?? "salon-catalog"} className="space-y-3">
                {serviceGroups.length > 1 ? (
                  <h3 className="text-sm font-semibold text-muted-foreground">{groupTitle}</h3>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.services.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{s.name}</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {s.duration} {t("salon.minutes")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold tabular-nums">{formatPrice(s.price)}</span>
                        <Link
                          to="/booking/$salonId"
                          params={{ salonId: salon.id }}
                          search={bookingBarberId ? { barber: bookingBarberId } : undefined}
                          className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background"
                        >
                          <Plus className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SectionBlock>

      {salon.staff.length > 0 ? (
        <SectionBlock id="salon-staff" title={t("salon.tabs.staff")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {salon.staff.map((b) => {
              const bookable = b.isBookable !== false;
              const isOwner = b.role === "Salon egasi";
              const inner = (
                <>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted text-base font-bold">
                    {b.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <p className="mt-3 text-sm font-semibold">{b.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{b.role}</p>
                  {!bookable && !isOwner ? (
                    <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                      {t("salon.staff.comingSoon", { defaultValue: "Tez orada" })}
                    </p>
                  ) : null}
                  {!bookable && isOwner ? (
                    <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                      {t("salon.staff.notBookableYet", {
                        defaultValue: "Hozircha band qilib bo'lmaydi",
                      })}
                    </p>
                  ) : null}
                </>
              );
              if (!bookable) {
                return (
                  <div
                    key={b.id}
                    className="rounded-xl border border-border p-4 text-center opacity-60"
                  >
                    {inner}
                  </div>
                );
              }
              return (
                <Link
                  key={b.id}
                  to="/booking/$salonId"
                  params={{ salonId: salon.id }}
                  search={{ barber: b.id }}
                  className="rounded-xl border border-border p-4 text-center transition-colors hover:bg-muted/30"
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </SectionBlock>
      ) : null}

      <SectionBlock id="salon-reviews" title={t("salon.tabs.reviews")}>
        <SalonReviewsSection
          summary={salon.ratingSummary}
          reviews={salon.reviews}
          isMock={reviewsAreMock}
        />
      </SectionBlock>

      <div id="salon-location" className="scroll-mt-36 border-b border-border pb-10">
        <SalonLocationSection
          address={salon.address}
          lat={salon.lat}
          lng={salon.lng}
          salonId={salon.id}
        />
      </div>

      {(salon.hours.length > 0 || salon.closedWeekdays.length > 0) ? (
        <div id="salon-hours" className="scroll-mt-36 border-b border-border pb-10">
          <SalonHoursSection hours={salon.hours} closedWeekdays={salon.closedWeekdays} />
        </div>
      ) : null}

      {showCalendar ? (
        <div id="salon-booking" className="scroll-mt-36 border-b border-border pb-10">
          <SalonBookingCalendar
            salonId={salon.id}
            barberId={calendarBarberId}
            serviceIds={calendarServiceIds.length ? calendarServiceIds : undefined}
            months={calendarMonths}
          />
        </div>
      ) : null}

      {salon.portfolio.length > 0 ? (
        <SectionBlock id="salon-portfolio" title={t("salon.tabs.portfolio")} className="border-b-0">
          <SalonPortfolioGallery images={salon.portfolio} />
        </SectionBlock>
      ) : null}
    </div>
  );
}
