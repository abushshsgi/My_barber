import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { AccountDesktopShell } from "@/components/desktop/pages/AccountDesktopShell";
import { PageHeader } from "@/components/PageHeader";
import { PageSpotlightEmpty } from "@/components/ui/PageSpotlightEmpty";

export const Route = createFileRoute("/today")({
  head: () => ({ meta: [{ title: "Bugungi bo'sh vaqtlar — mysaloon.uz" }] }),
  component: TodayPage,
});

function TodayHero() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(135deg,#0f0f0f_0%,#2d2418_48%,#111_100%)] px-5 py-6 text-background sm:px-7">
      <div className="pointer-events-none absolute -right-6 top-0 h-36 w-36 rounded-full bg-amber-400/25 blur-3xl" aria-hidden />
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
        <Flame className="h-3.5 w-3.5" />
        {t("todayPage.heroBadge")}
      </span>
      <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-[28px]">{t("todayPage.heroTitle")}</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">{t("todayPage.heroDesc")}</p>
    </section>
  );
}

function TodayContent() {
  const { t } = useTranslation();

  return (
    <div className="page-stagger space-y-6">
      <TodayHero />
      <PageSpotlightEmpty
        icon={CalendarPlus}
        tone="warm"
        title={t("todayPage.empty", { defaultValue: "Bugungi bo'sh vaqtlar tez orada" })}
        description={t("todayPage.emptyHint", {
          defaultValue: "Salonlar jadvali ulanishi bilan shu yerda haqiqiy bo'sh slotlar ko'rsatiladi.",
        })}
        action={
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-3.5 text-sm font-bold text-background active:scale-[0.98]"
          >
            {t("favorites.browseSalons", { defaultValue: "Salonlarni topish" })}
          </Link>
        }
      />
    </div>
  );
}

function TodayMobile() {
  const { t } = useTranslation();
  return (
    <div className="min-h-full bg-surface pb-[calc(68px+env(safe-area-inset-bottom)+12px)]">
      <PageHeader showBack title={t("todayPage.title")} subtitle={t("todayPage.pickerSubtitle")} />
      <div className="rounded-t-[28px] bg-background px-5 py-6 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.08)]">
        <TodayContent />
      </div>
    </div>
  );
}

function TodayDesktop() {
  const { t } = useTranslation();
  return (
    <AccountDesktopShell wide bare title={t("todayPage.title")} subtitle={t("todayPage.pickerSubtitle")}>
      <TodayContent />
    </AccountDesktopShell>
  );
}

function TodayPage() {
  return <DesktopPageSplit mobile={<TodayMobile />} desktop={<TodayDesktop />} />;
}
