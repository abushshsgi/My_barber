import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { MIN_ACTIVE_SERVICES } from "@/components/barber/BarberContext";
import { EmptyBlock, SectionCard, StatusPill } from "@/components/barber/primitives";
import { SomPriceInput } from "@/components/barber/SomPriceInput";
import { cn } from "@/lib/utils";
import type { ServicesPageState } from "./use-services-page";
import { serviceImageSrc } from "./utils";

type BlockProps = { state: ServicesPageState };

export function StudioStatsStrip({ state }: BlockProps) {
  const { activeCount, services, availableCatalog, selectedCatalogRows } = state;
  const pending = selectedCatalogRows.length;

  const items = [
    {
      label: "Katalog",
      value: availableCatalog.length,
      hint: "Admin katalogidagi xizmatlar",
      accent: "text-sky-600",
      bg: "bg-sky-500/10",
    },
    {
      label: "Mening xizmatlarim",
      value: services.length,
      hint: pending > 0 ? `+${pending} ta qo'shish kutilmoqda` : "Tanlangan va narx qo'yilgan",
      accent: "text-violet-600",
      bg: "bg-violet-500/10",
    },
    {
      label: "Faol",
      value: activeCount,
      hint: "Mijozlar ko'radigan xizmatlar",
      accent: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
  ] as const;

  return (
    <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 border-y border-border bg-gradient-to-b from-muted/60 to-background">
      <div className="mx-auto grid max-w-[min(100%,1400px)] grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0 px-4 sm:px-6 lg:px-8">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-4 py-5 sm:px-6 first:sm:pl-0 last:sm:pr-0">
            <div
              className={cn(
                "grid size-12 shrink-0 place-items-center rounded-2xl font-heading text-lg font-bold",
                item.bg,
                item.accent,
              )}
            >
              {item.value}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-background/80 px-4 py-4 sm:px-5">
      <div>
        <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function ServicesActivationBanners({ state }: BlockProps) {
  const { fullyReady, activationSteps, activationServicesCount, activeCount, refreshActivationStatus } =
    state;
  return (
    <>
      {!fullyReady && activationSteps.services_ok && !activationSteps.schedule_ok ? (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/35 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            <span className="font-medium">Keyingi qadam:</span>{" "}
            <span className="font-medium">Ish jadvali</span> sahifasida haftalik vaqtni sozlang va
            saqlang.
          </p>
          <Link
            to="/barber/schedule"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background"
          >
            Ish jadvaliga o&apos;tish
          </Link>
        </div>
      ) : null}
      {!fullyReady && !activationSteps.services_ok ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          <p>
            <span className="font-medium">Faol xizmatlar:</span> sahifada {activeCount} ta, serverda{" "}
            {activationServicesCount} ta (kerak: kamida {MIN_ACTIVE_SERVICES} ta).
          </p>
          {activeCount < MIN_ACTIVE_SERVICES ? (
            <p className="mt-2 text-muted-foreground">
              Katalogdan xizmat tanlang, narx kiriting va qo&apos;shing.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

type ServiceRowProps = {
  service: ServicesPageState["services"][number];
  editable: boolean;
  compact?: boolean;
  card?: boolean;
  onPriceChange: (digits: string) => void;
  onToggle: () => void;
  onDelete: () => void;
};

export function ServiceRow({
  service,
  editable,
  compact,
  card,
  onPriceChange,
  onToggle,
  onDelete,
}: ServiceRowProps) {
  if (card) {
    return (
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
          !editable && "opacity-70",
        )}
      >
        <img
          src={serviceImageSrc(service.image_url)}
          alt=""
          loading="lazy"
          className="aspect-[16/10] w-full object-cover"
        />
        <div className="space-y-3 p-4">
          <div>
            <p className="font-semibold text-foreground">{service.name}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> {service.duration_minutes} daqiqa
            </p>
          </div>
          <SomPriceInput value={service.price} disabled={!editable} onChange={onPriceChange} />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!editable}
              onClick={onToggle}
              className={cn(
                "flex-1 rounded-lg border px-2 py-2 text-xs font-medium",
                service.is_active
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {service.is_active ? "Faol" : "O'chiq"}
            </button>
            <button
              type="button"
              disabled={!editable}
              onClick={onDelete}
              className="rounded-lg border border-border px-3 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3 rounded-xl border border-border bg-muted/30 p-3",
        compact
          ? "sm:grid-cols-[minmax(0,1.2fr)_110px_80px_auto]"
          : "sm:grid-cols-[minmax(0,1.5fr)_130px_90px_auto]",
        !editable && "opacity-70",
      )}
    >
      <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
        <img
          src={serviceImageSrc(service.image_url)}
          alt=""
          loading="lazy"
          className={cn("shrink-0 rounded-2xl object-cover", compact ? "h-10 w-10" : "h-14 w-14")}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{service.name}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> {service.duration_minutes} daqiqa
          </p>
        </div>
      </div>
      <SomPriceInput value={service.price} disabled={!editable} onChange={onPriceChange} />
      <button
        type="button"
        disabled={!editable}
        onClick={onToggle}
        className={cn(
          "h-10 rounded-lg border px-2 text-xs font-medium",
          service.is_active
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-border bg-background text-muted-foreground",
        )}
      >
        {service.is_active ? "Faol" : "O'chiq"}
      </button>
      <button
        type="button"
        disabled={!editable}
        onClick={onDelete}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-3 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function ServicesListBlock({
  state,
  compact,
  cardGrid,
  embedded,
}: BlockProps & { compact?: boolean; cardGrid?: boolean; embedded?: boolean }) {
  const { services, activeCount, savingServices, canEditService, saveAllServices, updateServicePrice, toggleServiceActive, deleteService } =
    state;

  const saveBtn = (
    <button
      onClick={() => void saveAllServices()}
      disabled={savingServices}
      className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
    >
      {savingServices ? "Saqlanmoqda..." : "Saqlash"}
    </button>
  );

  const body = (
    <div className={cn("space-y-3", cardGrid && "grid gap-4 sm:grid-cols-2 space-y-0", embedded && "p-4 sm:p-5")}>
      {services.length === 0 ? (
        <EmptyBlock
          title="Hali xizmat tanlanmagan"
          description="Chapdan katalogdan xizmat tanlang, o'ngda narx qo'ying."
          icon={<Sparkles className="size-4" />}
        />
      ) : (
        services.map((service) => {
          const editable = canEditService(service);
          return (
            <ServiceRow
              key={service.id}
              service={service}
              editable={editable}
              compact={compact}
              card={cardGrid}
              onPriceChange={(digits) => updateServicePrice(service.id, digits)}
              onToggle={() => void toggleServiceActive(service)}
              onDelete={() => void deleteService(service)}
            />
          );
        })
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PanelHeader
          title="Tanlangan xizmatlar"
          description={`${activeCount} ta faol · narx va holatni shu yerda boshqaring`}
          actions={saveBtn}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      </div>
    );
  }

  return (
    <SectionCard
      title="Xizmatlar"
      description={`${activeCount} ta faol xizmat. Narxni siz boshqarasiz, davomiylik va nom esa admin katalogidan keladi.`}
      actions={saveBtn}
    >
      {body}
    </SectionCard>
  );
}

export function CatalogBrowseBlock({ state }: BlockProps) {
  const {
    catalogQuery,
    setCatalogQuery,
    catalogCategory,
    setCatalogCategory,
    pickerCategories,
    availableCatalog,
    selectedCatalogIds,
    togglePendingCatalog,
  } = state;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader
        title="Barcha xizmatlar"
        description="Katalogdan tanlang — narx o'ng panelda belgilanadi"
      />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Xizmat qidiring..."
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={catalogCategory}
            onChange={(e) => setCatalogCategory(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Barcha kategoriyalar</option>
            {pickerCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {availableCatalog.map((item) => {
            const selected = selectedCatalogIds.has(String(item.id));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => togglePendingCatalog(String(item.id))}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                  selected
                    ? "border-foreground bg-foreground text-background shadow-sm"
                    : "border-border bg-background hover:border-foreground/30 hover:bg-muted/30",
                )}
              >
                <img
                  src={serviceImageSrc(item.image_url)}
                  alt=""
                  loading="lazy"
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p
                    className={cn(
                      "mt-0.5 line-clamp-2 text-[11px]",
                      selected ? "text-background/75" : "text-muted-foreground",
                    )}
                  >
                    {item.duration_minutes} daq ·{" "}
                    {item.category_names.join(" · ") || "Katalog"}
                  </p>
                </div>
                {selected ? <CheckCircle2 className="size-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CatalogPendingBlock({ state }: BlockProps) {
  const {
    selectedCatalogRows,
    savingServices,
    updatePendingCatalog,
    togglePendingCatalog,
    setPendingServices,
    addService,
  } = state;

  if (selectedCatalogRows.length === 0) return null;

  return (
    <div className="border-t border-dashed border-border bg-muted/20 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Qo'shilishi kutilmoqda</p>
        <button
          type="button"
          onClick={() => setPendingServices([])}
          className="text-xs font-medium text-muted-foreground underline"
        >
          Tozalash
        </button>
      </div>
      <div className="space-y-2">
        {selectedCatalogRows.map(({ catalog, catalog_service, price, is_active }) => (
          <div
            key={catalog_service}
            className="grid gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_120px_72px_auto]"
          >
            <div className="flex min-w-0 items-center gap-2">
              <img
                src={serviceImageSrc(catalog.image_url)}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
              <p className="truncate text-sm font-medium">{catalog.name}</p>
            </div>
            <SomPriceInput
              value={price}
              onChange={(digits) => updatePendingCatalog(catalog_service, { price: digits })}
            />
            <button
              type="button"
              onClick={() => updatePendingCatalog(catalog_service, { is_active: !is_active })}
              className="h-10 rounded-lg border px-2 text-xs font-medium"
            >
              {is_active ? "Faol" : "O'chiq"}
            </button>
            <button type="button" onClick={() => togglePendingCatalog(catalog_service)}>
              <Trash2 className="size-4 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => void addService()}
        disabled={savingServices}
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background sm:w-auto sm:px-5"
      >
        <Plus className="size-4" />
        {selectedCatalogRows.length} ta xizmatni qo&apos;shish
      </button>
    </div>
  );
}

export function CatalogPickerBlock({ state }: BlockProps) {
  const {
    catalogQuery,
    setCatalogQuery,
    catalogCategory,
    setCatalogCategory,
    pickerCategories,
    availableCatalog,
    selectedCatalogIds,
    selectedCatalogRows,
    savingServices,
    togglePendingCatalog,
    updatePendingCatalog,
    setPendingServices,
    addService,
  } = state;

  return (
    <div className="space-y-4 rounded-xl border border-dashed border-border p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={catalogQuery}
            onChange={(e) => setCatalogQuery(e.target.value)}
            placeholder="Katalogdan xizmat qidiring"
            className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={catalogCategory}
          onChange={(e) => setCatalogCategory(e.target.value)}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Barcha kategoriyalar</option>
          {pickerCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {availableCatalog.map((item) => {
          const selected = selectedCatalogIds.has(String(item.id));
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => togglePendingCatalog(String(item.id))}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:border-foreground/40",
              )}
            >
              <img
                src={serviceImageSrc(item.image_url)}
                alt=""
                loading="lazy"
                className="h-16 w-16 shrink-0 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.name}</p>
                <p
                  className={cn(
                    "mt-1 line-clamp-2 text-xs",
                    selected ? "text-background/75" : "text-muted-foreground",
                  )}
                >
                  {item.description || item.category_names.join(" · ") || "Admin katalog xizmati"}
                </p>
              </div>
              {selected ? <CheckCircle2 className="size-5 shrink-0" /> : null}
            </button>
          );
        })}
      </div>

      {selectedCatalogRows.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Tanlangan: {selectedCatalogRows.length} ta</p>
            <button
              type="button"
              onClick={() => setPendingServices([])}
              className="text-xs font-medium text-muted-foreground underline"
            >
              Tozalash
            </button>
          </div>
          {selectedCatalogRows.map(({ catalog, catalog_service, price, is_active }) => (
            <div
              key={catalog_service}
              className="grid gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-[minmax(0,1.4fr)_130px_90px_auto]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={serviceImageSrc(catalog.image_url)}
                  alt=""
                  className="h-14 w-14 rounded-2xl object-cover"
                />
                <p className="truncate text-sm font-medium">{catalog.name}</p>
              </div>
              <SomPriceInput
                value={price}
                onChange={(digits) => updatePendingCatalog(catalog_service, { price: digits })}
              />
              <button
                type="button"
                onClick={() => updatePendingCatalog(catalog_service, { is_active: !is_active })}
                className="h-10 rounded-lg border px-2 text-xs font-medium"
              >
                {is_active ? "Faol" : "O'chiq"}
              </button>
              <button type="button" onClick={() => togglePendingCatalog(catalog_service)}>
                <Trash2 className="size-4 text-muted-foreground" />
              </button>
            </div>
          ))}
          <button
            onClick={() => void addService()}
            disabled={savingServices}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background"
          >
            <Plus className="size-4" />
            {selectedCatalogRows.length} ta xizmatni qo&apos;shish
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function RecommendationsBlock({ state }: BlockProps) {
  const { recommendations, applyRecommendation } = state;
  return (
    <SectionCard title="Tavsiyalar" description="Bookinglardan qoida asosidagi maslahatlar.">
      {recommendations.length === 0 ? (
        <EmptyBlock title="Tavsiya yo'q" icon={<Sparkles className="size-4" />} />
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <button
              key={`${rec.kind}-${rec.service_id ?? index}`}
              type="button"
              onClick={() => void applyRecommendation(rec)}
              className="w-full rounded-xl border border-border bg-muted/30 p-3 text-left hover:bg-muted"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="text-sm font-medium">{rec.title}</div>
                <StatusPill status="active" label={rec.action_label} />
              </div>
              <p className="text-xs text-muted-foreground">{rec.description}</p>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export function ScheduleAsideBlock() {
  return (
    <SectionCard title="Ish jadvali">
      <p className="text-sm text-muted-foreground">
        Haftalik ish vaqti alohida sahifada boshqariladi.
      </p>
      <Link
        to="/barber/schedule"
        className="mt-3 inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium"
      >
        Ish jadvalini ochish
      </Link>
    </SectionCard>
  );
}
