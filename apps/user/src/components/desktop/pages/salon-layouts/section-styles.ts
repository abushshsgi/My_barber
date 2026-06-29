import type { SalonDesktopLayoutId } from "./types";

export type SalonSectionUi = {
  section: string;
  title: string;
  aboutWrap: string;
  aboutText: string;
  servicesWrap: string;
  servicesGrid: string;
  serviceCard: string;
  serviceGroupTitle: string;
  staffGrid: string;
  staffCard: string;
  staffCardDisabled: string;
  amenities: "list" | "chips" | "grid" | "cards" | "inline";
  aside: "classic" | "accent" | "dark" | "glass" | "minimal";
  hours: "list" | "grid" | "pills" | "compact";
  location: "stack" | "split" | "map-first" | "card";
};

const STYLES: Record<SalonDesktopLayoutId, SalonSectionUi> = {
  1: {
    section: "scroll-mt-36 space-y-5 border-b border-border pb-10",
    title: "text-[22px] font-semibold tracking-tight",
    aboutWrap: "",
    aboutText: "max-w-2xl text-base leading-relaxed text-muted-foreground",
    servicesWrap: "space-y-6",
    servicesGrid: "grid gap-3 sm:grid-cols-2",
    serviceCard:
      "flex items-center justify-between gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/30",
    serviceGroupTitle: "text-sm font-semibold text-muted-foreground",
    staffGrid: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
    staffCard: "rounded-xl border border-border p-4 text-center transition-colors hover:bg-muted/30",
    staffCardDisabled: "rounded-xl border border-border p-4 text-center opacity-60",
    amenities: "list",
    aside: "classic",
    hours: "list",
    location: "stack",
  },
  2: {
    section: "scroll-mt-36 space-y-5 border-b border-border/60 pb-10",
    title: "text-2xl font-bold tracking-tight",
    aboutWrap: "rounded-2xl border-l-4 border-foreground bg-muted/25 px-5 py-4",
    aboutText: "text-base italic leading-relaxed text-foreground/85",
    servicesWrap: "space-y-8",
    servicesGrid: "flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory",
    serviceCard:
      "flex min-w-[240px] snap-start flex-col justify-between gap-4 rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-background p-5 shadow-sm transition-transform hover:-translate-y-0.5",
    serviceGroupTitle: "text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground",
    staffGrid: "flex gap-4 overflow-x-auto pb-2",
    staffCard:
      "min-w-[160px] shrink-0 rounded-2xl border border-border bg-gradient-to-b from-muted/30 to-background p-5 text-center transition-colors hover:border-foreground/30",
    staffCardDisabled: "min-w-[160px] shrink-0 rounded-2xl border border-dashed border-border p-5 text-center opacity-50",
    amenities: "chips",
    aside: "accent",
    hours: "grid",
    location: "split",
  },
  3: {
    section: "scroll-mt-36 space-y-4 border-b border-border pb-8",
    title: "text-lg font-bold uppercase tracking-wide text-muted-foreground",
    aboutWrap: "rounded-xl bg-muted/30 px-4 py-3",
    aboutText: "text-sm leading-relaxed text-foreground",
    servicesWrap: "space-y-4",
    servicesGrid: "divide-y divide-border rounded-xl border border-border overflow-hidden",
    serviceCard:
      "flex items-center justify-between gap-3 bg-background px-4 py-3.5 transition-colors hover:bg-muted/20",
    serviceGroupTitle: "px-4 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
    staffGrid: "space-y-2",
    staffCard:
      "flex items-center gap-4 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/25",
    staffCardDisabled: "flex items-center gap-4 rounded-xl border border-dashed border-border px-4 py-3 opacity-50",
    amenities: "grid",
    aside: "dark",
    hours: "compact",
    location: "map-first",
  },
  4: {
    section: "scroll-mt-36 space-y-6 border-b border-border/40 pb-12",
    title: "font-serif text-3xl font-semibold tracking-tight",
    aboutWrap: "max-w-3xl",
    aboutText: "text-lg leading-relaxed text-muted-foreground",
    servicesWrap: "space-y-8",
    servicesGrid: "grid gap-4",
    serviceCard:
      "group flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-6 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.15)] transition-all hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.2)]",
    serviceGroupTitle: "text-base font-semibold text-foreground",
    staffGrid: "grid grid-cols-1 gap-4 sm:grid-cols-2",
    staffCard:
      "flex items-center gap-5 rounded-2xl border border-border p-5 transition-colors hover:bg-muted/20",
    staffCardDisabled: "flex items-center gap-5 rounded-2xl border border-dashed border-border p-5 opacity-50",
    amenities: "cards",
    aside: "glass",
    hours: "pills",
    location: "card",
  },
  5: {
    section: "scroll-mt-36 space-y-3 border-b border-dashed border-border pb-6",
    title: "text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground",
    aboutWrap: "",
    aboutText: "text-sm leading-snug text-muted-foreground line-clamp-4",
    servicesWrap: "space-y-2",
    servicesGrid: "space-y-0",
    serviceCard:
      "flex items-center justify-between gap-2 border-b border-border/60 py-2.5 last:border-0 transition-colors hover:bg-muted/15",
    serviceGroupTitle: "text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80",
    staffGrid: "flex flex-wrap gap-2",
    staffCard:
      "inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted/30",
    staffCardDisabled: "inline-flex items-center gap-2 rounded-full border border-dashed border-border px-3 py-1.5 text-xs opacity-50",
    amenities: "inline",
    aside: "minimal",
    hours: "compact",
    location: "stack",
  },
};

export function salonSectionUi(layout: SalonDesktopLayoutId): SalonSectionUi {
  return STYLES[layout];
}
