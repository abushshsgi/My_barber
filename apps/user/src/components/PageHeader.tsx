import { ChevronLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  sticky?: boolean;
  transparent?: boolean;
}

export function PageHeader({ title, subtitle, showBack, right, sticky, transparent }: Props) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "z-30 flex items-center justify-between px-5 py-4",
        sticky && "sticky top-0 backdrop-blur-md",
        transparent ? "bg-transparent" : "bg-background/95",
      )}
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
    >
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => router.history.back()}
            className="grid h-10 w-10 place-items-center rounded-full bg-surface active:scale-95"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </button>
        )}
        {(title || subtitle) && (
          <div>
            {title && <h1 className="text-xl font-bold tracking-tight leading-tight">{title}</h1>}
            {subtitle && (
              <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
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
