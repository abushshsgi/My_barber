import { useTranslation } from "react-i18next";
import { SETTINGS_LANGS } from "@/components/settings/useSettingsPage";
import { setLang, type AppLang } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function FooterLanguageSwitch({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const active = (i18n.resolvedLanguage || i18n.language || "uz").split("-")[0] as AppLang;

  return (
    <div
      className={cn("inline-flex items-center gap-0.5 rounded-full border border-border bg-background p-1", className)}
      role="group"
      aria-label="Language"
    >
      {SETTINGS_LANGS.map(({ code, label }) => {
        const isActive = active === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => void setLang(code)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors",
              isActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={isActive}
            title={label}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
