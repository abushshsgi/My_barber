import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { getMobileContentPaddingClass } from "@/lib/layout-constants";
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

/** Standart mobil ro'yxat sahifasi — neo header + panel kontent. */
export function MobileListPage({
  title,
  subtitle,
  showBack = true,
  right,
  children,
  className,
}: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className={cn("min-h-full", getMobileContentPaddingClass(pathname), className)}>
      <PageHeader showBack={showBack} title={title} subtitle={subtitle} right={right} transparent />
      <div className="page-stagger mx-3 mb-3 rounded-2xl neo-panel px-4 py-5">{children}</div>
    </div>
  );
}
