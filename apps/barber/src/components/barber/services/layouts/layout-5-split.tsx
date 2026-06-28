import type { ServicesPageState } from "../use-services-page";
import {
  CatalogPickerBlock,
  RecommendationsBlock,
  ServicesListBlock,
} from "../ServicesBlocks";

export function ServicesLayout5Split({ state }: { state: ServicesPageState }) {
  return (
    <div className="grid min-h-[60vh] gap-0 overflow-hidden rounded-2xl border border-border lg:grid-cols-2">
      <div className="space-y-6 border-b border-border p-4 lg:border-b-0 lg:border-r lg:overflow-y-auto">
        <h2 className="font-heading text-lg font-bold">Mening xizmatlarim</h2>
        <ServicesListBlock state={state} />
      </div>
      <div className="space-y-6 bg-muted/20 p-4 lg:overflow-y-auto">
        <h2 className="font-heading text-lg font-bold">Katalog</h2>
        <CatalogPickerBlock state={state} />
        <RecommendationsBlock state={state} />
      </div>
    </div>
  );
}
