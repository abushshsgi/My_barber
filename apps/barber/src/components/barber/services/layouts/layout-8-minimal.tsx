import type { ServicesPageState } from "../use-services-page";
import {
  CatalogPickerBlock,
  RecommendationsBlock,
  ServicesListBlock,
} from "../ServicesBlocks";

export function ServicesLayout8Minimal({ state }: { state: ServicesPageState }) {
  return (
    <div className="mx-auto max-w-3xl space-y-12 py-2">
      <div className="border-b border-border pb-8">
        <ServicesListBlock state={state} compact />
      </div>
      <div className="border-b border-border pb-8">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Katalog
        </p>
        <CatalogPickerBlock state={state} />
      </div>
      <RecommendationsBlock state={state} />
    </div>
  );
}
