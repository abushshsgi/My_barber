"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type NavLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "className"> & {
  href: string;
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  end?: boolean;
};

const PanelNavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, pendingClassName, href, end, ...props }, ref) => {
    const pathname = usePathname() ?? "";
    const path = href.split("?")[0] ?? href;
    const isActive = end
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`);
    const isPending = false;

    return (
      <Link
        ref={ref}
        href={href}
        className={cn(className, isActive && activeClassName, isPending && pendingClassName)}
        {...props}
      />
    );
  },
);

PanelNavLink.displayName = "NavLink";

export { PanelNavLink as NavLink };
