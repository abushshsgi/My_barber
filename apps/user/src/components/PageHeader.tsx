import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { navigateBack } from "@/lib/mobile-back";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  sticky?: boolean;
  transparent?: boolean;
  className?: string;
  backFallback?: string;
}

export function PageHeader({
  title,
  subtitle,
  showBack,
  right,
  sticky,
  transparent,
  className,
  backFallback = "/",
}: Props) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "z-30 flex items-center justify-between px-4 py-3 lg:px-5 lg:py-4",
        sticky && "sticky top-0 backdrop-blur-md",
        transparent ? "bg-transparent" : "bg-background/95 lg:bg-background/95",
        className,
      )}
      style={{ paddingTop: "max(env(safe-area-inset-top), 0.5rem)" }}
    >
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            type="button"
            onClick={() => navigateBack(router, backFallback)}
            className="neo-pill grid h-11 w-11 place-items-center active:scale-95 lg:rounded-full lg:border lg:border-border lg:bg-surface lg:shadow-none"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </button>
        )}
        {(title || subtitle) && (
          <div>
            {title && (
              <h1 className="text-xl font-extrabold leading-tight tracking-tight lg:font-bold">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="label-eyebrow mt-0.5 lg:text-[11px] lg:font-bold lg:normal-case lg:tracking-[0.14em]">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </header>
  );
}
