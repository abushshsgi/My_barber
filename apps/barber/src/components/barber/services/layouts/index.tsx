import type { ComponentType } from "react";
import type { ServicesLayoutId } from "../types";
import type { ServicesPageState } from "../use-services-page";
import { ServicesLayout1Classic } from "./layout-1-classic";
import { ServicesLayout2Studio } from "./layout-2-studio";
import { ServicesLayout3Compact } from "./layout-3-compact";
import { ServicesLayout4Cards } from "./layout-4-cards";
import { ServicesLayout5Split } from "./layout-5-split";
import { ServicesLayout6Stacked } from "./layout-6-stacked";
import { ServicesLayout7Sidebar } from "./layout-7-sidebar";
import { ServicesLayout8Minimal } from "./layout-8-minimal";

const LAYOUTS: Record<ServicesLayoutId, ComponentType<{ state: ServicesPageState }>> = {
  1: ServicesLayout1Classic,
  2: ServicesLayout2Studio,
  3: ServicesLayout3Compact,
  4: ServicesLayout4Cards,
  5: ServicesLayout5Split,
  6: ServicesLayout6Stacked,
  7: ServicesLayout7Sidebar,
  8: ServicesLayout8Minimal,
};

export function ServicesLayoutView({
  layout,
  state,
}: {
  layout: ServicesLayoutId;
  state: ServicesPageState;
}) {
  const Component = LAYOUTS[layout] ?? ServicesLayout1Classic;
  return <Component state={state} />;
}
