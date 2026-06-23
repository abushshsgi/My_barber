import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useAuthAccent } from "@/components/auth/AuthAccentContext";
import type { AuthAccent } from "@/lib/auth-desktop-variant";
import { ACCENT_STYLES } from "@/lib/auth-desktop-variant";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  type?: "button" | "submit";
  form?: string;
  loading?: boolean;
  disabled?: boolean;
  disabledTooltip?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "brand";
  accent?: AuthAccent;
};

export function AuthSubmitButton({
  type = "submit",
  form,
  loading,
  disabled,
  disabledTooltip,
  onClick,
  children,
  className,
  variant = "primary",
  accent: accentProp,
}: Props) {
  const accentCtx = useAuthAccent();
  const accent = accentProp ?? accentCtx;
  const a = ACCENT_STYLES[accent];
  const isDisabled = disabled || loading;

  const button = (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 md:h-11 md:text-sm",
        variant === "brand"
          ? cn(a.btn, a.btnHover, "text-primary-foreground")
          : variant === "primary"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-border bg-background text-foreground hover:bg-muted",
        className,
      )}
    >
      {loading && <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />}
      <span className={cn("transition-opacity", loading && "opacity-70")}>{children}</span>
    </button>
  );

  if (isDisabled && disabledTooltip && !loading) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{button}</span>
        </TooltipTrigger>
        <TooltipContent>{disabledTooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
