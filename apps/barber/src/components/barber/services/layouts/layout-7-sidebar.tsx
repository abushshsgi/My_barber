import type { ServicesPageState } from "../use-services-page";
import {
  CatalogPickerBlock,
  RecommendationsBlock,
  ScheduleAsideBlock,
  ServicesListBlock,
} from "../ServicesBlocks";

export function ServicesLayout7Sidebar({ state }: { state: ServicesPageState }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start">
        <RecommendationsBlock state={state} />
        <ScheduleAsideBlock />
        <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
          <p className="font-medium">{state.activeCount} ta faol xizmat</p>
          <p className="mt-1 text-muted-foreground">{state.services.length} ta jami</p>
        </div>
      </aside>
      <div className="space-y-6">
        <ServicesListBlock state={state} />
        <CatalogPickerBlock state={state} />
      </div>
    </div>
  );
}
