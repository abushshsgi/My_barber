import type { ServicesPageState } from "../use-services-page";
import {
  CatalogPickerBlock,
  RecommendationsBlock,
  ScheduleAsideBlock,
  ServicesListBlock,
} from "../ServicesBlocks";

export function ServicesLayout2Studio({ state }: { state: ServicesPageState }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-2xl bg-foreground p-5 text-background sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-background/60">Faol</p>
          <p className="font-heading text-3xl font-bold">{state.activeCount}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-background/60">Jami</p>
          <p className="font-heading text-3xl font-bold">{state.services.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-background/60">Katalog</p>
          <p className="font-heading text-3xl font-bold">{state.availableCatalog.length}</p>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6 rounded-2xl border-2 border-foreground/10 bg-card p-1 shadow-sm">
          <ServicesListBlock state={state} cardGrid />
          <CatalogPickerBlock state={state} />
        </div>
        <aside className="space-y-6">
          <RecommendationsBlock state={state} />
          <ScheduleAsideBlock />
        </aside>
      </div>
    </div>
  );
}
