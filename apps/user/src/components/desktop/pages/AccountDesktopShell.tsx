import { DESKTOP_ACCOUNT_BG, DESKTOP_GLASS_PANEL } from "@/components/desktop/ui/desktop-glass";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  bare?: boolean;
  wide?: boolean;
};

/** Desktop account pages — content only; nav lives in header dropdown. */
export function AccountDesktopShell({ title, subtitle, children, bare, wide }: Props) {
  return (
    <div className={cn("mx-auto w-full", wide ? "max-w-6xl" : "max-w-3xl", DESKTOP_ACCOUNT_BG)}>
      {title ? (
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}
        </header>
      ) : null}

      {bare ? children : <div className={cn(DESKTOP_GLASS_PANEL, "p-5 lg:p-6")}>{children}</div>}
    </div>
  );
}
