import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import {
  groupSalonServicesByBarber,
  resolveDefaultSalonBarberId,
  resolveDefaultServiceIdsForBarber,
} from "@/lib/salon-services";
import { ClientOnly } from "@/components/ClientOnly";
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
    <section id={id} className={cn("scroll-mt-36 space-y-5 border-b border-border pb-12", className)}>
      {title ? <h2 className="text-2xl font-semibold tracking-tight">{title}</h2> : null}
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
        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">{salon.about}</p>
      </SectionBlock>

      {salon.amenities.length > 0 ? (
        <div id="salon-amenities" className="scroll-mt-36 border-b border-border pb-12">
          <SalonAmenitiesSection
            amenities={salon.amenities}
            variant={salon.venueKind === "salon" ? "salon" : "solo_studio"}
          />
        </div>
      ) : null}

      <SectionBlock id="salon-services" title={t("salon.tabs.services")}>
        <div className="space-y-8">
          {serviceGroups.map((group) => {
            const bookingBarberId = group.barberId ?? ownerBarberId;
            const groupTitle = group.barberId
              ? group.barberName ?? t("salon.staff.title", { defaultValue: "Usta" })
              : t("salon.services.salonCatalog", { defaultValue: "Salon xizmatlari" });
            return (
              <div key={group.barberId ?? "salon-catalog"} className="space-y-4">
                {serviceGroups.length > 1 ? (
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {groupTitle}
                  </h3>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.services.map((s) => (
                    <div
                      key={s.id}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-5 transition-all hover:border-foreground/20 hover:shadow-[0_8px_30px_-18px_rgba(0,0,0,0.15)]"
                    >
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{s.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {s.duration} {t("salon.minutes")}
                        </p>
                      </div>
                      <Link
                        to="/booking/$salonId"
                        params={{ salonId: salon.id }}
                        search={bookingBarberId ? { barber: bookingBarberId } : undefined}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform group-hover:scale-105"
                        aria-label={t("salon.bookNow")}
                      >
                        <Plus className="h-4 w-4" />
                      </Link>
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {salon.staff.map((b) => {
              const bookable = b.isBookable !== false;
              const isOwner = b.role === "Salon egasi";
              const inner = (
                <>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-muted text-lg font-bold">
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
                    className="rounded-2xl border border-border p-5 text-center opacity-60"
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
                  className="rounded-2xl border border-border p-5 text-center transition-all hover:border-foreground/20 hover:shadow-[0_8px_30px_-18px_rgba(0,0,0,0.12)]"
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

      <div id="salon-location" className="scroll-mt-36 border-b border-border pb-12">
        <SalonLocationSection
          address={salon.address}
          lat={salon.lat}
          lng={salon.lng}
          salonId={salon.id}
        />
      </div>

      {(salon.hours.length > 0 || salon.closedWeekdays.length > 0) ? (
        <div id="salon-hours" className="scroll-mt-36 border-b border-border pb-12">
          <SalonHoursSection hours={salon.hours} closedWeekdays={salon.closedWeekdays} />
        </div>
      ) : null}

      {showCalendar ? (
        <div id="salon-booking" className="scroll-mt-36 border-b border-border pb-12">
          <ClientOnly
            fallback={
              <div className="h-72 animate-pulse rounded-2xl bg-muted" aria-label={t("common.loading")} />
            }
          >
            <SalonBookingCalendar
              salonId={salon.id}
              barberId={calendarBarberId}
              serviceIds={calendarServiceIds.length ? calendarServiceIds : undefined}
              months={calendarMonths}
            />
          </ClientOnly>
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
