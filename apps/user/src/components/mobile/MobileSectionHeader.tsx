import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** Neo section sarlavha — label-eyebrow + neo-panel wrapper. */
export function MobileSectionHeader({ title, eyebrow, action, children, className }: Props) {
  return (
    <section className={cn("neo-panel p-4", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="label-eyebrow">{eyebrow}</p> : null}
          <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
