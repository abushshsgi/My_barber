import { cn } from "@/lib/utils";
import { AccountDesktopShell } from "@/components/desktop/pages/AccountDesktopShell";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { MobilePageShell } from "@/components/mobile/MobilePageShell";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
  headerExtra?: React.ReactNode;
  backTo?: string;
  strictBack?: boolean;
  flush?: boolean;
};

function ProfileSubpageMobile({
  title,
  subtitle,
  children,
  className,
  right,
  headerExtra,
  backTo = "/profile",
  strictBack,
  flush,
}: Props) {
  return (
    <MobilePageShell
      title={title}
      subtitle={subtitle}
      className={className}
      right={right}
      headerExtra={headerExtra}
      backTo={backTo}
      strictBack={strictBack}
      flush={flush}
    >
      {children}
    </MobilePageShell>
  );
}

/** Ichki sahifalar — mobil neo shell; desktop: sidebar + glass panel. */
export function ProfileSubpageLayout({
  title,
  subtitle,
  children,
  className,
  right,
  headerExtra,
  backTo = "/profile",
  strictBack = true,
  flush,
}: Props) {
  return (
    <DesktopPageSplit
      mobile={
        <ProfileSubpageMobile
          title={title}
          subtitle={subtitle}
          className={className}
          right={right}
          headerExtra={headerExtra}
          backTo={backTo}
          strictBack={strictBack}
          flush={flush}
        >
          {children}
        </ProfileSubpageMobile>
      }
      desktop={
        <AccountDesktopShell
          title={title}
          subtitle={subtitle}
          backTo={backTo}
          strictBack={strictBack}
        >
          {children}
        </AccountDesktopShell>
      }
    />
  );
}

export function ProfileSubpageCard({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,15,15,0.05)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
