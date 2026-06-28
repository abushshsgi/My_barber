import { Link } from "@tanstack/react-router";
import { Instagram, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FooterLanguageSwitch } from "@/components/footer/FooterLanguageSwitch";
import { SiteFooterSchema } from "@/components/footer/SiteFooterSchema";
import { DESKTOP_SHELL_INSET } from "@/lib/desktop-bazaar-layout";
import {
  FOOTER_CONTACT,
  FOOTER_PAYMENT_METHODS,
  FOOTER_SECTIONS,
  FOOTER_SOCIAL,
  type FooterLink,
  type FooterSection,
} from "@/lib/footer-links";
import { cn } from "@/lib/utils";

type Props = {
  insetClassName?: string;
  className?: string;
};

function FooterNavLink({ link }: { link: FooterLink }) {
  const { t } = useTranslation();
  const label = t(link.labelKey, { defaultValue: link.defaultValue });
  const className = "text-sm font-semibold text-foreground hover:underline";

  if (link.external) {
    return (
      <a href={link.to} className={className} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  }

  return (
    <Link to={link.to} className={className}>
      {label}
    </Link>
  );
}

function FooterSectionBlock({ section, mobile }: { section: FooterSection; mobile?: boolean }) {
  const { t } = useTranslation();
  const title = t(section.titleKey, { defaultValue: section.titleDefault });

  if (mobile) {
    return (
      <details className="group border-b border-border/60 py-3 lg:hidden">
        <summary className="cursor-pointer list-none text-sm font-bold text-foreground [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            {title}
            <span className="text-muted-foreground transition group-open:rotate-45">+</span>
          </span>
        </summary>
        <nav className="mt-3 flex flex-col gap-2.5 pb-1">
          {section.links.map((link) => (
            <FooterNavLink key={`${section.id}-${link.to}-${link.labelKey}`} link={link} />
          ))}
        </nav>
      </details>
    );
  }

  return (
    <div className="hidden min-w-0 lg:block">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <nav className="mt-3 flex flex-col gap-2">
        {section.links.map((link) => (
          <FooterNavLink key={`${section.id}-${link.to}-${link.labelKey}`} link={link} />
        ))}
      </nav>
    </div>
  );
}

function FooterSocialRow({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <a
        href={FOOTER_SOCIAL.telegram}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-surface"
        aria-label="Telegram"
      >
        <Send className="h-3.5 w-3.5" strokeWidth={2.2} />
        Telegram
      </a>
      <a
        href={FOOTER_SOCIAL.instagram}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-surface"
        aria-label="Instagram"
      >
        <Instagram className="h-3.5 w-3.5" strokeWidth={2.2} />
        Instagram
      </a>
      <span className="text-xs text-muted-foreground">
        {t("footer.hours", { defaultValue: "24/7 onlayn bron" })}
      </span>
    </div>
  );
}

export function SiteFooter({ insetClassName, className }: Props) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "shrink-0 bg-white/[0.01] py-8 sm:py-10",
        insetClassName ?? DESKTOP_SHELL_INSET,
        className,
      )}
    >
      <SiteFooterSchema />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))] lg:gap-6 xl:gap-8">
        <div className="min-w-0">
          <Link to="/" className="inline-flex items-baseline gap-0.5">
            <span className="text-lg font-bold tracking-tight text-foreground">mysaloon</span>
            <span className="text-sm font-bold text-muted-foreground">.uz</span>
          </Link>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {t("footer.tagline", { defaultValue: "Salon va sartarosh bron platformasi" })}
          </p>
          <p className="mt-3 text-sm font-semibold text-foreground">
            <a href={FOOTER_CONTACT.phoneHref} className="hover:underline">
              {FOOTER_CONTACT.phone}
            </a>
          </p>
          <FooterSocialRow className="mt-4" />
          <FooterLanguageSwitch className="mt-4" />
          <div className="mt-4 flex flex-wrap gap-2">
            {FOOTER_PAYMENT_METHODS.map((method) => (
              <span
                key={method}
                className="rounded-md border border-border/70 bg-background px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
              >
                {method}
              </span>
            ))}
          </div>
        </div>

        {FOOTER_SECTIONS.map((section) => (
          <FooterSectionBlock key={section.id} section={section} />
        ))}
      </div>

      <div className="mt-2 lg:hidden">
        {FOOTER_SECTIONS.map((section) => (
          <FooterSectionBlock key={`mobile-${section.id}`} section={section} mobile />
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">© {year} mysaloon.uz</p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold">
          <Link to="/privacy" className="text-foreground hover:underline">
            {t("profile.privacy", { defaultValue: "Maxfiylik" })}
          </Link>
          <Link to="/privacy" className="text-foreground hover:underline">
            {t("footer.terms", { defaultValue: "Foydalanish shartlari" })}
          </Link>
          <Link to="/support" className="text-muted-foreground hover:text-foreground hover:underline">
            {t("profile.support", { defaultValue: "Yordam" })}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
