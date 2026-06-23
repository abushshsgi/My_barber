import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  tone?: "warm" | "cool" | "neutral";
};

const toneRing: Record<NonNullable<Props["tone"]>, string> = {
  warm: "from-amber-100/80 via-orange-50/40 to-transparent",
  cool: "from-sky-100/80 via-indigo-50/40 to-transparent",
  neutral: "from-muted/80 via-surface/40 to-transparent",
};

export function PageSpotlightEmpty({
  icon: Icon,
  title,
  description,
  action,
  className,
  tone = "neutral",
}: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-border bg-background px-6 py-14 text-center",
        "lg:px-10 lg:py-16",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-8 top-0 h-40 rounded-full bg-gradient-to-b blur-2xl",
          toneRing[tone],
        )}
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-sm flex-col items-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 scale-150 rounded-full bg-foreground/[0.03] blur-xl" aria-hidden />
          <div className="grid h-20 w-20 place-items-center rounded-[24px] border border-border/60 bg-surface shadow-[0_12px_40px_-16px_rgba(0,0,0,0.25)]">
            <Icon className="h-9 w-9 text-foreground" strokeWidth={1.8} />
          </div>
        </div>
        <h3 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {action ? <div className="mt-7 w-full sm:w-auto">{action}</div> : null}
      </div>
    </div>
  );
}
