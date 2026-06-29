import type { ComponentType } from "react";
import type { SalonDesktopLayoutId, SalonDesktopPageProps } from "./types";
import { SalonDesktopLayout1Classic } from "./layout-1-classic";
import { SalonDesktopLayout2HeroSplit } from "./layout-2-hero-split";
import { SalonDesktopLayout3SidebarLeft } from "./layout-3-sidebar-left";
import { SalonDesktopLayout4Editorial } from "./layout-4-editorial";
import { SalonDesktopLayout5Compact } from "./layout-5-compact";

const LAYOUTS: Record<SalonDesktopLayoutId, ComponentType<SalonDesktopPageProps>> = {
  1: SalonDesktopLayout1Classic,
  2: SalonDesktopLayout2HeroSplit,
  3: SalonDesktopLayout3SidebarLeft,
  4: SalonDesktopLayout4Editorial,
  5: SalonDesktopLayout5Compact,
};

export function SalonDesktopLayoutView({
  layout,
  ...props
}: Omit<SalonDesktopPageProps, "layoutId"> & { layout: SalonDesktopLayoutId }) {
  const Component = LAYOUTS[layout] ?? SalonDesktopLayout1Classic;
  return <Component {...props} layoutId={layout} />;
}
