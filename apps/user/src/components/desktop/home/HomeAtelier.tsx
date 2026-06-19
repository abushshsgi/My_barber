import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { getHairstyleImageUrl } from "@/lib/hairstyles/catalog";

type Props = { data: HomeData };

/** Atelier — Magazine: katta hero, asymmetrik grid */
export function HomeAtelier({ data }: Props) {
  const { t } = useTranslation();
  const { filtered, featuredSalons, trending, personalized } = data;
  const [hero, second, third] = featuredSalons;

  return (
    <div className="-mx-4">
      <section className="relative flex min-h-[420px] items-end overflow-hidden bg-neutral-900 px-12 pb-16 pt-24 text-white">
        <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/40 to-transparent" />
        <div className="relative max-w-2xl">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Issue 01 · 2026</p>
          <h1 className="mt-4 font-serif text-5xl font-light leading-[1.1] md:text-6xl">{t("home.title")}</h1>
          <p className="mt-6 max-w-md text-lg text-white/75">{t("homePage.editorialTagline")}</p>
          <Link
            to="/explore"
            className="mt-8 inline-flex items-center gap-2 border-b border-white pb-1 text-sm uppercase tracking-[0.2em]"
          >
            Kashf etish <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {hero ? (
        <section className="mt-16 px-4">
          <h2 className="font-serif text-3xl font-light">{t(personalized ? "homePage.nearYou" : "homePage.pickedForYou")}</h2>
          <div className="mt-8 grid grid-cols-12 gap-6">
            <div className="col-span-7">
              <DesktopSalonCard salon={hero} variant="editorial" />
            </div>
            <div className="col-span-5 flex flex-col gap-6">
              {second ? <DesktopSalonCard salon={second} variant="editorial" /> : null}
              {third ? <DesktopSalonCard salon={third} variant="editorial" /> : null}
            </div>
          </div>
        </section>
      ) : null}

      {trending.length > 0 ? (
        <section className="mt-20 border-t border-black/10 px-4 pt-16">
          <h2 className="font-serif text-2xl font-light">{t("homePage.quick.trends")}</h2>
          <div className="mt-8 grid grid-cols-4 gap-6">
            {trending.slice(0, 4).map((s) => (
              <Link key={s.id} to="/explore/$styleId" params={{ styleId: s.id }}>
                <div className="aspect-[3/4] overflow-hidden bg-neutral-200">
                  <img src={getHairstyleImageUrl({ imageUrl: s.imageUrl })} alt="" className="h-full w-full object-cover" />
                </div>
                <p className="mt-3 font-serif text-lg">{s.title}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-20 px-4 pb-8">
        <h2 className="font-serif text-2xl font-light">{t("home.nearby")}</h2>
        <div className="mt-8 grid grid-cols-2 gap-x-12 gap-y-14">
          {filtered.slice(0, 6).map((s) => (
            <DesktopSalonCard key={s.id} salon={s} variant="editorial" />
          ))}
        </div>
      </section>
    </div>
  );
}
