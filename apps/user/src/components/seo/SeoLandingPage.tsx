import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { getLandingCopy, localizedLandingPath } from "@/seo/registry";
import type { SeoLocale } from "@/seo/constants";
import type { LandingPageId } from "@/seo/content/landings";
import { cn } from "@/lib/utils";

type Props = {
  pageId: LandingPageId;
  locale: SeoLocale;
};

export function SeoLandingPage({ pageId, locale }: Props) {
  const copy = getLandingCopy(pageId, locale);
  const isMorf = pageId.startsWith("morf-ai");

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="inline-flex">
            <MysaloonLogo size="md" />
          </Link>
          <div className="flex gap-2 text-xs font-semibold text-muted-foreground">
            {locale !== "uz" ? (
              <Link to="/" className="hover:text-foreground">
                UZ
              </Link>
            ) : null}
            {locale !== "ru" ? (
              <Link to={localePath(pageId, "ru")} className="hover:text-foreground">
                RU
              </Link>
            ) : null}
            {locale !== "en" ? (
              <Link to={localePath(pageId, "en")} className="hover:text-foreground">
                EN
              </Link>
            ) : null}
          </div>
        </div>

        <p
          className={cn(
            "mt-8 inline-flex rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground",
            isMorf && "border-violet-200 bg-violet-50 text-violet-900",
          )}
        >
          {isMorf ? "Morf AI" : "MySaloon"}
        </p>

        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{copy.h1}</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{copy.intro || copy.description}</p>

        {copy.bullets?.length ? (
          <ul className="mt-6 space-y-2 text-sm text-foreground">
            {copy.bullets.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={copy.ctaHref}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-foreground px-6 text-sm font-bold text-background"
          >
            {copy.ctaLabel}
          </Link>
          {copy.secondaryCta ? (
            <Link
              to={copy.secondaryCta.href}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-background px-6 text-sm font-bold"
            >
              {copy.secondaryCta.label}
            </Link>
          ) : null}
        </div>

        {copy.faq?.length ? (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="text-lg font-bold">FAQ</h2>
            <dl className="mt-4 space-y-4">
              {copy.faq.map((item) => (
                <div key={item.question}>
                  <dt className="text-sm font-bold">{item.question}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <nav className="mt-12 flex flex-wrap gap-3 text-sm font-semibold text-muted-foreground">
          <Link to="/morf-ai" className="hover:text-foreground">
            Morf AI
          </Link>
          <Link to="/map" className="hover:text-foreground">
            Xarita
          </Link>
          <Link to="/explore" className="hover:text-foreground">
            Katalog
          </Link>
          <Link to="/for-salons" className="hover:text-foreground">
            Salonlar uchun
          </Link>
        </nav>
      </div>
    </div>
  );
}

function localePath(pageId: LandingPageId, locale: SeoLocale): string {
  return localizedLandingPath(pageId, locale);
}