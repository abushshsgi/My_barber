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

/** Standart mobil ro'yxat sahifasi — neo header + panel kontent.
 *  Pastki padding UserLayout orqali keladi (ikki marta qo'ymaymiz). */
export function MobileListPage({
  title,
  subtitle,
  showBack = true,
  right,
  children,
  className,
}: Props) {
  return (
    <div className={cn("min-h-full min-w-0", className)}>
      <PageHeader showBack={showBack} title={title} subtitle={subtitle} right={right} transparent />
      <div className="page-stagger mx-3 mb-3 rounded-2xl neo-panel px-4 py-5">{children}</div>
    </div>
  );
}
