import { Check, Clock, Loader2, Power, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatSomDigits } from "@mybarber/shared/format";
import { SomPriceInput } from "@/components/barber/SomPriceInput";
import { cn } from "@/lib/utils";
import type { ServicesPageState } from "./use-services-page";
import { serviceImageSrc } from "./utils";

type Props = { state: ServicesPageState };

export function ServicesCatalogGrid({ state }: Props) {
  const {
    catalogServices,
    services,
    activeCount,
    savingServices,
    catalogQuery,
    setCatalogQuery,
    catalogCategory,
    setCatalogCategory,
    pickerCategories,
    activateCatalogWithPrice,
    toggleServiceActive,
    canEditService,
  } = state;

  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const ownedByCatalog = useMemo(() => {
    const map = new Map<string, (typeof services)[number]>();
    for (const service of services) {
      if (service.catalog_service) map.set(service.catalog_service, service);
    }
    return map;
  }, [services]);

  const filteredCatalog = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    return [...catalogServices]
      .filter((item) => {
        const matchesCategory =
          catalogCategory === "all" || item.category_names.includes(catalogCategory);
        const matchesQuery =
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.category_names.some((name) => name.toLowerCase().includes(query));
        return matchesCategory && matchesQuery;
      })
      .sort((a, b) => a.sort_order - b.sort_order || a.index - b.index);
  }, [catalogCategory, catalogQuery, catalogServices]);

  const openEditor = (catalogId: string, presetPrice = "") => {
    setEditingCatalogId(catalogId);
    setDraftPrice(presetPrice);
  };

  const closeEditor = () => {
    setEditingCatalogId(null);
    setDraftPrice("");
    setConfirmingId(null);
  };

  const handleConfirm = async (catalogId: string) => {
    setConfirmingId(catalogId);
    const ok = await activateCatalogWithPrice(catalogId, draftPrice);
    setConfirmingId(null);
    if (ok) closeEditor();
  };

  const handleDeactivate = async (catalogId: string) => {
    const owned = ownedByCatalog.get(catalogId);
    if (!owned) return;
    await toggleServiceActive(owned);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px] lg:max-w-2xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Xizmat qidiring..."
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={catalogCategory}
            onChange={(e) => setCatalogCategory(e.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Barcha kategoriyalar</option>
            {pickerCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{activeCount}</span> ta faol ·{" "}
          <span className="font-semibold text-foreground">{filteredCatalog.length}</span> ta xizmat
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {filteredCatalog.map((catalog) => {
          const catalogId = String(catalog.id);
          const owned = ownedByCatalog.get(catalogId);
          const isActive = Boolean(owned?.is_active);
          const isEditing = editingCatalogId === catalogId;
          const editable = !owned || canEditService(owned);
          const busy = confirmingId === catalogId || (savingServices && isEditing);

          return (
            <article
              key={catalogId}
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md",
                isActive ? "border-emerald-500/40 ring-1 ring-emerald-500/20" : "border-border",
                !editable && "opacity-70",
              )}
            >
              <img
                src={serviceImageSrc(catalog.image_url)}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-heading text-base font-semibold leading-snug text-foreground">
                  {catalog.name}
                </h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5 shrink-0" />
                  {catalog.duration_minutes} daqiqa
                </p>
                {catalog.category_names.length ? (
                  <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                    {catalog.category_names.join(" · ")}
                  </p>
                ) : null}

                {isActive && !isEditing ? (
                  <p className="mt-3 font-heading text-lg font-semibold tabular-nums text-foreground">
                    {formatSomDigits(owned?.price ?? "")}{" "}
                    <span className="text-sm font-medium text-muted-foreground">so&apos;m</span>
                  </p>
                ) : null}

                <div className="mt-auto pt-4">
                  {isEditing ? (
                    <div className="flex items-end gap-2">
                      <SomPriceInput
                        value={draftPrice}
                        onChange={setDraftPrice}
                        disabled={busy}
                        label="Narx (so'm)"
                        className="min-w-0 flex-1"
                        compact
                      />
                      <button
                        type="button"
                        disabled={busy || !draftPrice.trim()}
                        onClick={() => void handleConfirm(catalogId)}
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        aria-label="Saqlash"
                      >
                        {busy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-5" strokeWidth={2.5} />
                        )}
                      </button>
                    </div>
                  ) : isActive ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!editable || savingServices}
                        onClick={() => openEditor(catalogId, owned?.price ?? "")}
                        className="flex-1 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                      >
                        Narxni o&apos;zgartirish
                      </button>
                      <button
                        type="button"
                        disabled={!editable || savingServices}
                        onClick={() => void handleDeactivate(catalogId)}
                        className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2.5 text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                        aria-label="O'chirish"
                      >
                        <Power className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!editable || savingServices}
                      onClick={() => openEditor(catalogId)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      Faollashtirish
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
