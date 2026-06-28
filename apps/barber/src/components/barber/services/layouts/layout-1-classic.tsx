import type { ServicesPageState } from "../use-services-page";
import {
  CatalogPickerBlock,
  RecommendationsBlock,
  ScheduleAsideBlock,
  ServicesListBlock,
} from "../ServicesBlocks";

export function ServicesLayout1Classic({ state }: { state: ServicesPageState }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <div id="activation-services" className="scroll-mt-24 space-y-6">
          <ServicesListBlock state={state} />
          <CatalogPickerBlock state={state} />
        </div>
      </div>
      <aside className="space-y-6">
        <RecommendationsBlock state={state} />
        <ScheduleAsideBlock />
      </aside>
    </div>
  );
}
