"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function NeoPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`neo-page min-h-screen ${className}`}>{children}</div>;
}

export function NeoSection({
  title,
  eyebrow,
  action,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`neo-panel p-4 ${className}`}>
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

export function NeoIconTile({
  icon: Icon,
  label,
  tone = "bg-accent text-accent-foreground",
}: {
  icon: LucideIcon;
  label: string;
  tone?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-xl border-2 border-border px-3 py-1.5 text-xs font-bold shadow-soft ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
