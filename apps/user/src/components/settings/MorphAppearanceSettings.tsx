import { useTranslation } from "react-i18next";
import { useMorphAppearance } from "@/hooks/use-morph-appearance";
import type { MorphFontSize, MorphThemeName } from "@/lib/morph-appearance";
import { cn } from "@/lib/utils";

/** Ilovadagi Ko‘rinish — yorug‘/qorong‘i, katta shrift, chat preview. */
export function MorphAppearanceSettings({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const { appearance, setTheme, setFontSize } = useMorphAppearance();
  const dark = appearance.theme === "dark";

  const themes: { id: MorphThemeName; label: string }[] = [
    { id: "light", label: t("chat.settings.themeLight", { defaultValue: "Yorug‘" }) },
    { id: "dark", label: t("chat.settings.themeDark", { defaultValue: "Qorong‘i" }) },
  ];
  const sizes: { id: MorphFontSize; label: string }[] = [
    { id: "s", label: t("chat.settings.fontSmall", { defaultValue: "Kichik" }) },
    { id: "m", label: t("chat.settings.fontMedium", { defaultValue: "O‘rtacha" }) },
    { id: "l", label: t("chat.settings.fontLarge", { defaultValue: "Katta" }) },
  ];

  return (
    <div className={cn("space-y-4", !embedded && "mb-4")}>
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-5"
        style={{ backgroundColor: dark ? "#121820" : "#C5D0C2" }}
      >
        <div className="ml-0 max-w-[85%] rounded-2xl rounded-bl-md bg-card px-3 py-2 text-sm text-card-foreground shadow-sm">
          {t("chat.settings.chatFontPreviewAi", { defaultValue: "Qanday uslub sinaymiz?" })}
          <span className="mt-1 block text-[10px] text-muted-foreground">12:04</span>
        </div>
        <div className="ml-auto mt-2 max-w-[85%] rounded-2xl rounded-br-md bg-[#6A67D6] px-3 py-2 text-sm text-white shadow-sm">
          {t("chat.settings.chatFontPreviewUser", { defaultValue: "Qisqa soch, toza chiziq" })}
          <span className="mt-1 block text-right text-[10px] text-white/70">12:04</span>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t("chat.settings.appearance", { defaultValue: "Ko‘rinish" })}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {themes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTheme(item.id)}
              className={cn(
                "rounded-full border px-3 py-2.5 text-xs font-bold uppercase tracking-[0.12em]",
                appearance.theme === item.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t("chat.settings.fontSize", { defaultValue: "Shrift" })}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {sizes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFontSize(item.id)}
              className={cn(
                "rounded-full border px-3 py-2.5 text-xs font-bold uppercase tracking-[0.12em]",
                appearance.fontSize === item.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground",
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
