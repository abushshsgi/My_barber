import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MobileSalonCard } from "@/components/mobile/MobileSalonCard";
import type { Salon } from "@/lib/mock-data";

type Props = {
  salons: Salon[];
};

/** Mobil bosh sahifa — vertikal salon ro'yxati. */
export function HomeMobileFeed({ salons }: Props) {
  const { t } = useTranslation();

  if (salons.length === 0) {
    return (
      <section className="mt-6 px-4">
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          {t("homePage.emptyTitle")}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-5 px-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight">{t("home.nearby")}</h2>
        <Link
          to="/map"
          className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground"
        >
          {t("common.viewMap")}
          <ChevronRight className="size-4" />
        </Link>
      </div>
      <ul className="space-y-2.5">
        {salons.map((salon) => (
          <li key={salon.id}>
            <MobileSalonCard salon={salon} layout="horizontal" />
          </li>
        ))}
      </ul>
    </section>
  );
}
