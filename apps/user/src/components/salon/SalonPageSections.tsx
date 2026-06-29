import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SalonDesktopLayoutId } from "@/components/desktop/pages/salon-layouts/types";
import { salonSectionUi } from "@/components/desktop/pages/salon-layouts/section-styles";
import type { Salon } from "@/lib/mock-data";
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
  ui,
  className,
}: {
  id: string;
  title?: string;
  children: ReactNode;
  ui: ReturnType<typeof salonSectionUi>;
  className?: string;
}) {
  return (
    <section id={id} className={cn(ui.section, className)}>
      {title ? <h2 className={ui.title}>{title}</h2> : null}
      {children}
    </section>
  );
}

function StaffAvatar({ name, layoutId }: { name: string; layoutId: SalonDesktopLayoutId }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");
  const horizontal = layoutId === 3 || layoutId === 4;
  return (
    <div
      className={cn(
        "grid place-items-center rounded-full bg-muted font-bold",
        horizontal ? "h-12 w-12 shrink-0 text-sm" : "mx-auto h-14 w-14 text-base",
      )}
    >
      {initials}
    </div>
  );
}

export function SalonPageSections({
  salon,
  calendarMonths = 1,
  showCalendar = true,
  reviewsAreMock = false,
  layoutId = 1,
}: {
  salon: Salon;
  calendarMonths?: 1 | 2;
  showCalendar?: boolean;
  reviewsAreMock?: boolean;
  layoutId?: SalonDesktopLayoutId;
}) {
  const { t } = useTranslation();
  const ui = salonSectionUi(layoutId);
  const serviceGroups = groupSalonServicesByBarber(salon.services);
  const ownerBarberId = salon.ownerId ?? resolveDefaultSalonBarberId(salon.staff) ?? undefined;
  const calendarBarberId = defaultCalendarBarberId(salon);
  const calendarServiceIds = resolveDefaultServiceIdsForBarber(salon.services, calendarBarberId);
  const staffHorizontal = layoutId === 3 || layoutId === 4;
  const staffInline = layoutId === 5;

  return (
    <div className="space-y-0">
      <SectionBlock id="salon-about" title={t("salon.tabs.about")} ui={ui}>
        <div className={ui.aboutWrap}>
          <p className={ui.aboutText}>{salon.about}</p>
        </div>
      </SectionBlock>

      {salon.amenities.length > 0 ? (
        <div id="salon-amenities" className={cn(ui.section, "border-b-0")}>
          <SalonAmenitiesSection
            amenities={salon.amenities}
            variant={salon.venueKind === "salon" ? "salon" : "solo_studio"}
            display={ui.amenities}
            titleClassName={ui.title}
          />
        </div>
      ) : null}

      <SectionBlock id="salon-services" title={t("salon.tabs.services")} ui={ui}>
        <div className={ui.servicesWrap}>
          {serviceGroups.map((group) => {
            const bookingBarberId = group.barberId ?? ownerBarberId;
            const groupTitle = group.barberId
              ? group.barberName ?? t("salon.staff.title", { defaultValue: "Usta" })
              : t("salon.services.salonCatalog", { defaultValue: "Salon xizmatlari" });
            return (
              <div key={group.barberId ?? "salon-catalog"} className="space-y-3">
                {serviceGroups.length > 1 ? (
                  <h3 className={ui.serviceGroupTitle}>{groupTitle}</h3>
                ) : null}
                <div className={ui.servicesGrid}>
                  {group.services.map((s) => (
                    <div key={s.id} className={ui.serviceCard}>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{s.name}</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {s.duration} {t("salon.minutes")}
                        </p>
                      </div>
                      <Link
                        to="/booking/$salonId"
                        params={{ salonId: salon.id }}
                        search={bookingBarberId ? { barber: bookingBarberId } : undefined}
                        className={cn(
                          "grid shrink-0 place-items-center bg-foreground text-background transition-opacity hover:opacity-90",
                          layoutId === 4 ? "h-11 w-11 rounded-xl" : "h-9 w-9 rounded-full",
                        )}
                        aria-label={t("salon.bookNow")}
                      >
                        {layoutId === 4 ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
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
        <SectionBlock id="salon-staff" title={t("salon.tabs.staff")} ui={ui}>
          <div className={ui.staffGrid}>
            {salon.staff.map((b) => {
              const bookable = b.isBookable !== false;
              const isOwner = b.role === "Salon egasi";
              const inner = staffInline ? (
                <>
                  <StaffAvatar name={b.name} layoutId={layoutId} />
                  <span>{b.name.split(" ")[0]}</span>
                </>
              ) : staffHorizontal ? (
                <>
                  <StaffAvatar name={b.name} layoutId={layoutId} />
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-semibold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.role}</p>
                    {!bookable ? (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {isOwner
                          ? t("salon.staff.notBookableYet", {
                              defaultValue: "Hozircha band qilib bo'lmaydi",
                            })
                          : t("salon.staff.comingSoon", { defaultValue: "Tez orada" })}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <StaffAvatar name={b.name} layoutId={layoutId} />
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
                  <div key={b.id} className={ui.staffCardDisabled}>
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
                  className={ui.staffCard}
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </SectionBlock>
      ) : null}

      <SectionBlock id="salon-reviews" title={t("salon.tabs.reviews")} ui={ui}>
        <SalonReviewsSection
          summary={salon.ratingSummary}
          reviews={salon.reviews}
          isMock={reviewsAreMock}
        />
      </SectionBlock>

      <div id="salon-location" className={ui.section}>
        <SalonLocationSection
          address={salon.address}
          lat={salon.lat}
          lng={salon.lng}
          salonId={salon.id}
          variant={ui.location}
          titleClassName={ui.title}
        />
      </div>

      {(salon.hours.length > 0 || salon.closedWeekdays.length > 0) ? (
        <div id="salon-hours" className={ui.section}>
          <SalonHoursSection
            hours={salon.hours}
            closedWeekdays={salon.closedWeekdays}
            variant={ui.hours}
            titleClassName={ui.title}
          />
        </div>
      ) : null}

      {showCalendar ? (
        <div id="salon-booking" className={ui.section}>
          <SalonBookingCalendar
            salonId={salon.id}
            barberId={calendarBarberId}
            serviceIds={calendarServiceIds.length ? calendarServiceIds : undefined}
            months={calendarMonths}
          />
        </div>
      ) : null}

      {salon.portfolio.length > 0 ? (
        <SectionBlock id="salon-portfolio" title={t("salon.tabs.portfolio")} ui={ui} className="border-b-0">
          <SalonPortfolioGallery images={salon.portfolio} />
        </SectionBlock>
      ) : null}
    </div>
  );
}
