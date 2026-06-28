import type { ServicesPageState } from "../use-services-page";
import {
  CatalogPickerBlock,
  RecommendationsBlock,
  ScheduleAsideBlock,
  ServicesListBlock,
} from "../ServicesBlocks";

export function ServicesLayout4Cards({ state }: { state: ServicesPageState }) {
  return (
    <div className="space-y-8">
      <ServicesListBlock state={state} cardGrid />
      <div className="grid gap-6 lg:grid-cols-2">
        <CatalogPickerBlock state={state} />
        <div className="space-y-6">
          <RecommendationsBlock state={state} />
          <ScheduleAsideBlock />
        </div>
      </div>
    </div>
  );
}
