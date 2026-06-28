import type { ServicesPageState } from "../use-services-page";
import {
  CatalogPickerBlock,
  RecommendationsBlock,
  ServicesListBlock,
} from "../ServicesBlocks";

export function ServicesLayout3Compact({ state }: { state: ServicesPageState }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm">
        <strong>{state.activeCount}</strong> faol · <strong>{state.services.length}</strong> jami xizmat
      </div>
      <ServicesListBlock state={state} compact />
      <CatalogPickerBlock state={state} />
      <RecommendationsBlock state={state} />
    </div>
  );
}
