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
  compact,
}: {
  id: string;
  title?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        compact
          ? "scroll-mt-20 space-y-3 border-b border-border pb-5"
          : "scroll-mt-28 space-y-5 border-b border-border pb-8 lg:scroll-mt-36 lg:pb-12",
        className,
      )}
    >
      {title ? (
        <h2
          className={cn(
            "font-semibold tracking-tight",
            compact ? "text-base" : "text-2xl",
          )}
        >
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function SalonPageSections({
  salon,
  calendarMonths = 1,
  showCalendar = true,
  reviewsAreMock = false,
  compact = false,
}: {
  salon: Salon;
  calendarMonths?: 1 | 2;
  showCalendar?: boolean;
  reviewsAreMock?: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const serviceGroups = groupSalonServicesByBarber(salon.services);
  const ownerBarberId = salon.ownerId ?? resolveDefaultSalonBarberId(salon.staff) ?? undefined;
  const calendarBarberId = defaultCalendarBarberId(salon);
  const calendarServiceIds = resolveDefaultServiceIdsForBarber(salon.services, calendarBarberId);
  const sectionGap = compact ? "pb-5" : "pb-12";

  return (
    <div className="space-y-0">
      <SectionBlock id="salon-about" title={t("salon.tabs.about")} compact={compact}>
        <p
          className={cn(
            "max-w-3xl leading-relaxed text-muted-foreground",
            compact ? "text-sm" : "text-base",
          )}
        >
          {salon.about}
        </p>
      </SectionBlock>

      {salon.amenities.length > 0 ? (
        <div id="salon-amenities" className={cn("scroll-mt-20 border-b border-border lg:scroll-mt-36", sectionGap)}>
          <SalonAmenitiesSection
            amenities={salon.amenities}
            variant={salon.venueKind === "salon" ? "salon" : "solo_studio"}
            compact={compact}
          />
        </div>
      ) : null}

      <SectionBlock id="salon-services" title={t("salon.tabs.services")} compact={compact}>
        <div className={compact ? "space-y-4" : "space-y-8"}>
          {serviceGroups.map((group) => {
            const bookingBarberId = group.barberId ?? ownerBarberId;
            const groupTitle = group.barberId
              ? group.barberName ?? t("salon.staff.title", { defaultValue: "Usta" })
              : t("salon.services.salonCatalog", { defaultValue: "Salon xizmatlari" });
            return (
              <div key={group.barberId ?? "salon-catalog"} className={compact ? "space-y-2" : "space-y-4"}>
                {serviceGroups.length > 1 ? (
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {groupTitle}
                  </h3>
                ) : null}
                <div className={cn("grid sm:grid-cols-2", compact ? "gap-2" : "gap-3")}>
                  {group.services.map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        "group flex items-center justify-between gap-3",
                        compact
                          ? "border-b border-border py-3 last:border-b-0"
                          : "rounded-2xl border border-border bg-background p-5 transition-all hover:border-foreground/20 hover:shadow-[0_8px_30px_-18px_rgba(0,0,0,0.15)]",
                      )}
                    >
                      <div className="min-w-0">
                        <h3 className={cn("truncate font-semibold", compact && "text-sm")}>{s.name}</h3>
                        <p className={cn("text-muted-foreground", compact ? "mt-0.5 text-xs" : "mt-1 text-sm")}>
                          {s.duration} {t("salon.minutes")}
                        </p>
                      </div>
                      <Link
                        to="/booking/$salonId"
                        params={{ salonId: salon.id }}
                        search={bookingBarberId ? { barber: bookingBarberId } : undefined}
                        className={cn(
                          "grid shrink-0 place-items-center rounded-full bg-foreground text-background",
                          compact ? "h-8 w-8" : "h-10 w-10 transition-transform group-hover:scale-105",
                        )}
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
        <SectionBlock id="salon-staff" title={t("salon.tabs.staff")} compact={compact}>
          <div
            className={cn(
              "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
              compact ? "gap-2" : "gap-4",
            )}
          >
            {salon.staff.map((b) => {
              const bookable = b.isBookable !== false;
              const isOwner = b.role === "Salon egasi";
              const inner = (
                <>
                  <div
                    className={cn(
                      "mx-auto grid place-items-center rounded-full bg-muted font-bold",
                      compact ? "h-12 w-12 text-sm" : "h-16 w-16 text-lg",
                    )}
                  >
                    {b.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <p className={cn("font-semibold", compact ? "mt-2 text-xs" : "mt-3 text-sm")}>{b.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{b.role}</p>
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
                    className={cn(
                      "text-center opacity-60",
                      compact ? "rounded-xl border border-border p-3" : "rounded-2xl border border-border p-5",
                    )}
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
                  className={cn(
                    "text-center",
                    compact
                      ? "rounded-xl border border-border p-3 active:bg-surface"
                      : "rounded-2xl border border-border p-5 transition-all hover:border-foreground/20 hover:shadow-[0_8px_30px_-18px_rgba(0,0,0,0.12)]",
                  )}
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </SectionBlock>
      ) : null}

      <SectionBlock id="salon-reviews" title={t("salon.tabs.reviews")} compact={compact}>
        <SalonReviewsSection
          summary={salon.ratingSummary}
          reviews={salon.reviews}
          isMock={reviewsAreMock}
        />
      </SectionBlock>

      <div id="salon-location" className={cn("scroll-mt-20 border-b border-border lg:scroll-mt-36", sectionGap)}>
        <SalonLocationSection
          address={salon.address}
          lat={salon.lat}
          lng={salon.lng}
          salonId={salon.id}
        />
      </div>

      {(salon.hours.length > 0 || salon.closedWeekdays.length > 0) ? (
        <div id="salon-hours" className={cn("scroll-mt-20 border-b border-border lg:scroll-mt-36", sectionGap)}>
          <SalonHoursSection hours={salon.hours} closedWeekdays={salon.closedWeekdays} />
        </div>
      ) : null}

      {showCalendar ? (
        <div id="salon-booking" className={cn("scroll-mt-20 border-b border-border lg:scroll-mt-36", sectionGap)}>
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
        <SectionBlock id="salon-portfolio" title={t("salon.tabs.portfolio")} className="border-b-0" compact={compact}>
          <SalonPortfolioGallery images={salon.portfolio} />
        </SectionBlock>
      ) : null}
    </div>
  );
}
