import { Link } from "@tanstack/react-router";
import { ChevronRight, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { getHairstyleImageUrl } from "@/lib/hairstyles/catalog";

type Props = { data: HomeData };

export function HomeDesktopEditorial({ data }: Props) {
  const { t } = useTranslation();
  const [hero, ...restFeatured] = data.featuredSalons;

  return (
    <div>
      <section className="relative aspect-[21/9] overflow-hidden rounded-3xl bg-surface">
        <div className="absolute inset-0 bg-gradient-to-br from-surface via-background to-surface" />
        <div className="relative flex h-full flex-col justify-center px-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">mysaloon.uz</p>
          <h1 className="mt-3 max-w-2xl text-5xl font-bold leading-[1.05] tracking-tight">{t("home.title")}</h1>
          <p className="mt-4 max-w-lg text-lg text-muted-foreground">{t("homePage.editorialTagline")}</p>
          <Link
            to="/today"
            className="mt-8 inline-flex w-fit rounded-full bg-foreground px-8 py-3.5 text-sm font-bold text-background"
          >
            {t("homePage.quick.today")}
          </Link>
        </div>
      </section>

      {hero ? (
        <section className="mt-12">
          <h2 className="mb-6 text-2xl font-bold">{t(data.personalized ? "homePage.nearYou" : "homePage.pickedForYou")}</h2>
          <div className="grid grid-cols-[1.2fr_1fr] gap-6">
            <DesktopSalonCard salon={hero} variant="editorial" />
            <div className="grid grid-rows-2 gap-6">
              {restFeatured.slice(0, 2).map((s) => (
                <DesktopSalonCard key={s.id} salon={s} variant="editorial" />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-12 grid grid-cols-[1fr_340px] gap-8">
        <section>
          {data.trending.length > 0 ? (
            <>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-2xl font-bold">{t("homePage.quick.trends")}</h2>
                <Link to="/explore" className="flex items-center text-sm font-bold">
                  {t("common.viewAll")} <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {data.trending.slice(0, 6).map((s) => (
                  <Link key={s.id} to="/explore/$styleId" params={{ styleId: s.id }}>
                    <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-surface">
                      <img src={getHairstyleImageUrl({ imageUrl: s.imageUrl })} alt="" className="h-full w-full object-cover" />
                    </div>
                    <p className="mt-2 font-bold">{s.title}</p>
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </section>
        <aside className="sticky top-24 h-fit rounded-2xl border border-border p-6">
          <Wand2 className="h-6 w-6" />
          <p className="mt-4 text-lg font-bold">{t("homePage.aiPromoTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("homePage.aiPromoHint")}</p>
          <Link to="/ai-style" className="mt-6 inline-flex rounded-full border-2 border-foreground px-6 py-2.5 text-sm font-bold">
            {t("homePage.quick.aiStyle")}
          </Link>
        </aside>
      </div>

      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-bold">{t("home.nearby")}</h2>
        <div className="grid grid-cols-2 gap-8">
          {data.filtered.slice(0, 8).map((s) => (
            <DesktopSalonCard key={s.id} salon={s} variant="editorial" />
          ))}
        </div>
      </section>
    </div>
  );
}
