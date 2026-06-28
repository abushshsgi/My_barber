import type { ServicesPageState } from "../use-services-page";
import {
  CatalogBrowseBlock,
  CatalogPendingBlock,
  RecommendationsBlock,
  ScheduleAsideBlock,
  ServicesListBlock,
  StudioStatsStrip,
} from "../ServicesBlocks";

export function ServicesLayout2Studio({ state }: { state: ServicesPageState }) {
  return (
    <div className="space-y-6">
      <StudioStatsStrip state={state} />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid min-h-[min(72vh,920px)] xl:grid-cols-2">
          <div className="flex min-h-[360px] min-w-0 flex-col border-b border-border bg-muted/15 xl:border-b-0 xl:border-r">
            <CatalogBrowseBlock state={state} />
          </div>
          <div className="flex min-h-[360px] min-w-0 flex-col">
            <ServicesListBlock state={state} cardGrid embedded />
            <CatalogPendingBlock state={state} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecommendationsBlock state={state} />
        <ScheduleAsideBlock />
      </div>
    </div>
  );
}
