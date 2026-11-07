import { useTranslation } from "react-i18next";
import { useMorphAppearance } from "@/hooks/use-morph-appearance";
import type { MorphFontSize, MorphThemeName } from "@/lib/morph-appearance";
import { cn } from "@/lib/utils";

/** Mobil Morf AI ko‘rinishi — ilova sozlamalaridagi yorug‘/qorong‘i va shrift. */
export function MorphAppearanceSettings() {
  const { t } = useTranslation();
  const { appearance, setTheme, setFontSize } = useMorphAppearance();

  const themes: { id: MorphThemeName; label: string }[] = [
    { id: "light", label: t("chat.settings.themeLight", { defaultValue: "Yorug‘" }) },
    { id: "dark", label: t("chat.settings.themeDark", { defaultValue: "Qorong‘i" }) },
  ];
  const sizes: { id: MorphFontSize; label: string }[] = [
    { id: "s", label: "S" },
    { id: "m", label: "M" },
    { id: "l", label: "L" },
  ];

  return (
    <div className="mb-4 space-y-4 rounded-2xl border border-border bg-card p-4 lg:hidden">
      <div>
        <p className="text-sm font-semibold">
          {t("chat.settings.appearance", { defaultValue: "Ko‘rinish" })}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {themes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTheme(item.id)}
              className={cn(
                "rounded-full border px-3 py-2 text-sm font-semibold",
                appearance.theme === item.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold">
          {t("chat.settings.fontSize", { defaultValue: "Shrift" })}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {sizes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFontSize(item.id)}
              className={cn(
                "rounded-full border px-3 py-2 text-sm font-semibold",
                appearance.fontSize === item.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
