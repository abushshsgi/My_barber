import { cn } from "@/lib/utils";

type ShellVariant = "single" | "twoColumn" | "split" | "wizard" | "fullBleed";

type Props = {
  variant?: ShellVariant;
  sidebar?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  mainClassName?: string;
  asideClassName?: string;
};

const variantClasses: Record<ShellVariant, string> = {
  single: "",
  twoColumn: "lg:grid lg:grid-cols-[minmax(280px,360px)_1fr] lg:gap-0 lg:min-h-[calc(100dvh-3.5rem)]",
  split: "lg:flex lg:min-h-[calc(100dvh-3.5rem)]",
  wizard: "lg:grid lg:grid-cols-[1fr_minmax(280px,320px)] lg:gap-8 lg:items-start",
  fullBleed: "",
};

const asideClasses: Record<ShellVariant, string> = {
  single: "",
  twoColumn: "lg:border-r lg:border-border lg:overflow-y-auto",
  split: "lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-border",
  wizard: "lg:sticky lg:top-20 lg:self-start",
  fullBleed: "",
};

export function DesktopPageShell({
  variant = "single",
  sidebar,
  aside,
  children,
  className,
  mainClassName,
  asideClassName,
}: Props) {
  return (
    <div className={cn(variantClasses[variant], className)}>
      {sidebar ? (
        <div className={cn(asideClasses[variant], "hidden lg:block")}>{sidebar}</div>
      ) : null}
      <div className={cn("min-w-0 flex-1", mainClassName)}>{children}</div>
      {aside ? (
        <div className={cn(asideClasses[variant], asideClassName, "hidden lg:block")}>{aside}</div>
      ) : null}
    </div>
  );
}
