import { Link, useSearch } from "@tanstack/react-router";
import type { HomeData } from "@/components/home/useHomeData";
import {
  HOME_GI_LAYOUT_COMPONENTS,
  HOME_GI_LAYOUTS,
  homeGiLayoutMeta,
  parseHomeGiLayout,
  type HomeGiLayoutId,
} from "@/lib/home-gi-layouts";
import { cn } from "@/lib/utils";

type Props = { data: HomeData };

type HomeSearch = { gi?: string };

function GiLayoutSwitcher({ active }: { active: HomeGiLayoutId }) {
  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex max-w-[min(96vw,720px)] -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
      <span className="hidden shrink-0 text-xs font-bold text-muted-foreground sm:inline">
        {homeGiLayoutMeta(active).title}
      </span>
      <Link
        to="/home/layout-variants"
        className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-xs font-bold text-background"
      >
        Barcha layoutlar
      </Link>
    </div>
  );
}

export function HomeDesktopRoot({ data }: Props) {
  const search = useSearch({ strict: false }) as HomeSearch;
  const gi = parseHomeGiLayout(search.gi);
  const Layout = HOME_GI_LAYOUT_COMPONENTS[gi];

  return (
    <div className="relative">
      <Layout data={data} />
      <GiLayoutSwitcher active={gi} />
    </div>
  );
}

export function HomeGiLayoutPreviewStrip({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {HOME_GI_LAYOUTS.map((layout) => (
        <Link
          key={layout.id}
          to="/"
          search={{ gi: layout.id }}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-surface"
        >
          {layout.id}
        </Link>
      ))}
    </div>
  );
}
