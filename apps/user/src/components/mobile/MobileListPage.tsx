import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

type Props = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Standart mobil ro'yxat sahifasi — sticky header + ixcham kontent. */
export function MobileListPage({
  title,
  subtitle,
  showBack = true,
  right,
  children,
  className,
}: Props) {
  return (
    <div className={cn("min-h-full min-w-0 overflow-x-clip", className)}>
      <PageHeader showBack={showBack} sticky title={title} subtitle={subtitle} right={right} />
      <div className="page-stagger min-w-0 px-4 py-3">{children}</div>
    </div>
  );
}
