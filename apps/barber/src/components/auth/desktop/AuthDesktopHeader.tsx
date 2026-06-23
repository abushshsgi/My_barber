import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuthAccent } from "@/lib/auth-desktop-variant";
import { ACCENT_STYLES } from "@/lib/auth-desktop-variant";

type Props = {
  tab: "login" | "signup";
  onTabChange: (tab: "login" | "signup") => void;
  accent?: AuthAccent;
  mode?: "light" | "dark";
  className?: string;
};

export function AuthDesktopHeader({
  tab,
  onTabChange,
  accent = "violet",
  mode = "light",
  className,
}: Props) {
  const a = ACCENT_STYLES[accent];

  return (
    <header
      className={cn(
        "relative z-20 flex items-center justify-between gap-4 px-6 py-5 lg:px-10",
        mode === "dark" && "text-white",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg text-white", a.logo)}>
          <Scissors className="size-4" />
        </div>
        <span className={cn("text-base font-bold tracking-tight", mode === "dark" ? "text-white" : a.text)}>
          MySaloon
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <a
          href="mailto:support@mysaloon.uz"
          className={cn(
            "hidden text-sm font-medium sm:inline",
            mode === "dark" ? "text-zinc-400 hover:text-white" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Yordam
        </a>
        <button
          type="button"
          onClick={() => onTabChange(tab === "login" ? "signup" : "login")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold transition-all active:scale-[0.98]",
            tab === "login"
              ? cn(a.btn, a.btnHover, "text-white")
              : mode === "dark"
                ? "border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                : "border border-border bg-white text-foreground hover:bg-zinc-50",
          )}
        >
          {tab === "login" ? "Ro'yxatdan o'tish" : "Kirish"}
        </button>
      </div>
    </header>
  );
}

/** Kichik logo — split layoutlar ichida. */
export function AuthDesktopLogo({
  accent = "violet",
  dark = false,
  className,
}: {
  accent?: AuthAccent;
  dark?: boolean;
  className?: string;
}) {
  const a = ACCENT_STYLES[accent];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex size-8 items-center justify-center rounded-lg text-white", a.logo)}>
        <Scissors className="size-3.5" />
      </div>
      <span className={cn("text-sm font-bold", dark ? "text-white" : "text-foreground")}>MySaloon</span>
    </div>
  );
}
