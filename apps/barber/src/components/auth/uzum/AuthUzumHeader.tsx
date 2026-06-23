import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  tab: "login" | "signup";
  onTabChange: (tab: "login" | "signup") => void;
};

export function AuthUzumHeader({ tab, onTabChange }: Props) {
  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-4 md:px-10 md:py-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm">
          <Scissors className="size-4" />
        </div>
        <div className="min-w-0 leading-none">
          <span className="text-lg font-bold tracking-tight text-violet-700">mysaloon</span>
          <span className="ml-1.5 text-lg font-semibold text-foreground">partners</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-4">
        <a
          href="mailto:support@mysaloon.uz"
          className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
        >
          Yordam
        </a>
        <button
          type="button"
          onClick={() => onTabChange(tab === "login" ? "signup" : "login")}
          className={cn(
            "rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
            tab === "login"
              ? "bg-violet-600 text-white shadow-sm hover:bg-violet-700"
              : "border border-border bg-white text-foreground hover:bg-zinc-50",
          )}
        >
          {tab === "login" ? "Ro'yxatdan o'tish" : "Kirish"}
        </button>
      </div>
    </header>
  );
}
