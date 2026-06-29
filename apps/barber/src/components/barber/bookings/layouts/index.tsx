import type { ComponentType } from "react";
import type { BookingsLayoutId } from "../types";
import type { BookingsPageState } from "../use-bookings-page";
import { BookingsLayout1Classic } from "./layout-1-classic";
import { BookingsLayout2Studio } from "./layout-2-studio";
import { BookingsLayout3Compact } from "./layout-3-compact";
import { BookingsLayout4Cards } from "./layout-4-cards";
import { BookingsLayout5Split } from "./layout-5-split";
import { BookingsLayout6Stacked } from "./layout-6-stacked";
import { BookingsLayout7Sidebar } from "./layout-7-sidebar";
import { BookingsLayout8Kanban } from "./layout-8-kanban";
import { BookingsLayout9Table } from "./layout-9-table";
import { BookingsLayout10Minimal } from "./layout-10-minimal";

const LAYOUTS: Record<BookingsLayoutId, ComponentType<{ state: BookingsPageState }>> = {
  1: BookingsLayout1Classic,
  2: BookingsLayout2Studio,
  3: BookingsLayout3Compact,
  4: BookingsLayout4Cards,
  5: BookingsLayout5Split,
  6: BookingsLayout6Stacked,
  7: BookingsLayout7Sidebar,
  8: BookingsLayout8Kanban,
  9: BookingsLayout9Table,
  10: BookingsLayout10Minimal,
};

export function BookingsLayoutView({
  layout,
  state,
}: {
  layout: BookingsLayoutId;
  state: BookingsPageState;
}) {
  const Component = LAYOUTS[layout] ?? BookingsLayout1Classic;
  return <Component state={state} />;
}
