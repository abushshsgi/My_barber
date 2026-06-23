import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
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
}: Props) {
  const isDisabled = disabled || loading;

  const button = (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-[var(--transition-smooth)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 md:h-11 md:text-sm",
        variant === "brand"
          ? "bg-violet-600 text-white hover:bg-violet-700"
          : variant === "primary"
            ? "bg-zinc-900 text-amber-100 hover:bg-zinc-800"
            : "border border-border bg-background text-foreground hover:bg-muted",
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin shrink-0" aria-hidden />}
      <span className={cn("transition-opacity", loading && "opacity-70")}>{children}</span>
    </button>
  );

  if (isDisabled && disabledTooltip && !loading) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block w-full">{button}</span>
        </TooltipTrigger>
        <TooltipContent>{disabledTooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
