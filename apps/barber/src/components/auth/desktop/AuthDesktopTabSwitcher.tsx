import { cn } from "@/lib/utils";
import type { AuthAccent } from "@/lib/auth-desktop-variant";
import { ACCENT_STYLES } from "@/lib/auth-desktop-variant";

type Props = {
  tab: "login" | "signup";
  onTabChange: (tab: "login" | "signup") => void;
  accent: AuthAccent;
};

export function AuthDesktopTabSwitcher({ tab, onTabChange, accent }: Props) {
  const a = ACCENT_STYLES[accent];

  return (
    <div className="mb-1 grid grid-cols-2 gap-1 p-1">
      {(["login", "signup"] as const).map((t) => {
        const active = tab === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onTabChange(t)}
            className={cn(
              "cursor-pointer rounded-lg py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
              active ? cn(a.btn, "text-white shadow-sm") : "text-muted-foreground hover:bg-white/60 hover:text-foreground",
            )}
          >
            {t === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
          </button>
        );
      })}
    </div>
  );
}
