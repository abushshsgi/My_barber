import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ScanFace, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function MorfAiExploreCard({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <Link
      to="/ai-style"
      preload="intent"
      className={cn(
        "group relative flex min-h-[220px] cursor-pointer flex-col justify-between overflow-hidden rounded-[1.75rem] bg-foreground p-6 text-background shadow-[0_20px_50px_-28px_rgba(0,0,0,0.55)] transition-[box-shadow,filter] duration-200 hover:brightness-110 hover:shadow-[0_28px_60px_-24px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-background/10 blur-2xl transition group-hover:bg-background/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 left-6 size-48 rounded-full bg-background/5 blur-3xl"
        aria-hidden
      />

      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-background/20 bg-background/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
          <Sparkles className="size-3.5" strokeWidth={2.2} />
          Morf AI
        </span>
        <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight">
          {t("explorePage.aiStyleCtaTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-background/70">
          {t("explorePage.aiStyleCtaDesc")}
        </p>
      </div>

      <div className="relative mt-8 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-2xl bg-background px-4 py-3 text-sm font-bold text-foreground transition group-hover:bg-background/95">
          <ScanFace className="size-4" strokeWidth={2.2} />
          {t("explorePage.tryAiStyle")}
        </span>
        <span className="grid size-11 place-items-center rounded-2xl border border-background/25 bg-background/10 transition group-hover:bg-background/20">
          <ArrowUpRight className="size-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}