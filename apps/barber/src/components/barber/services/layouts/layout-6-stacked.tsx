import type { ServicesPageState } from "../use-services-page";
import {
  CatalogPickerBlock,
  RecommendationsBlock,
  ScheduleAsideBlock,
  ServicesListBlock,
} from "../ServicesBlocks";

export function ServicesLayout6Stacked({ state }: { state: ServicesPageState }) {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-border">
        <div className="bg-foreground px-5 py-3 text-sm font-semibold text-background">
          1. Faol xizmatlar ({state.activeCount})
        </div>
        <div className="p-4">
          <ServicesListBlock state={state} />
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-border">
        <div className="bg-muted px-5 py-3 text-sm font-semibold">2. Katalogdan qo&apos;shish</div>
        <div className="p-4">
          <CatalogPickerBlock state={state} />
        </div>
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        <RecommendationsBlock state={state} />
        <ScheduleAsideBlock />
      </section>
    </div>
  );
}
