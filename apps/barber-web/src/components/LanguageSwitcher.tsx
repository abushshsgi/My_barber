"use client";

import { LOCALES, type Locale } from "@/lib/i18n/locale";
import { useLocale } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, string> = { uz: "UZ", ru: "RU", en: "EN" };

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={cn(
        "inline-flex rounded-xl border border-border/60 bg-muted/40 p-0.5 gap-0.5",
        className
      )}
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors min-w-[2.5rem]",
            locale === l
              ? "bg-accent text-accent-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
