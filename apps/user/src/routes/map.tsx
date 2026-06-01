import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import {
  MapPin, Star, SlidersHorizontal, Search, Navigation, Locate,
  ChevronUp, Compass, Flame, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { shortPrice } from "@/lib/mock-data";
import { useSalons } from "@/hooks/use-user-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Xarita — mysaloon.uz" },
      { name: "description", content: "Yaqin atrofdagi salonlar va ustalarni xaritada toping." },
    ],
  }),
  component: MapView,
});

const SNAPS = { peek: 160, half: 380, full: 640 };

// Stable marker positions (so cluster math is deterministic)
const POSITIONS = [
  { top: 28, left: 38 },
  { top: 42, left: 62 },
  { top: 36, left: 72 },
  { top: 56, left: 32 },
  { top: 62, left: 58 },
  { top: 48, left: 48 }, // overlaps cluster zone
  { top: 30, left: 50 },
];

function MapView() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [tab, setTab] = useState<"salons" | "barbers">("salons");
  const [active, setActive] = useState("");
  const [query, setQuery] = useState("");
  const [heatmap, setHeatmap] = useState(false);
  const [bearing, setBearing] = useState(0);
  const salonsQuery = useSalons(query);
  const salons = salonsQuery.data?.salons ?? [];

  useEffect(() => {
    if (!active && salons[0]) setActive(salons[0].id);
  }, [active, salons]);

  const filtered = useMemo(() => {
    if (!query.trim()) return salons;
    const q = query.toLowerCase();
    return salons.filter(
      (s) => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q),
    );
  }, [query, salons]);

  const markers = filtered.map((s, i) => ({ ...s, pos: POSITIONS[i % POSITIONS.length] }));

  // Simple cluster: any pair within 8% are clustered (here positions 1 & 5 & 6 are close)
  const clusters = useMemo(() => {
    const used = new Set<number>();
    const out: { x: number; y: number; ids: string[] }[] = [];
    markers.forEach((m, i) => {
      if (used.has(i)) return;
      const group = [i];
      markers.forEach((m2, j) => {
        if (i === j || used.has(j)) return;
        const dx = m.pos.left - m2.pos.left;
        const dy = m.pos.top - m2.pos.top;
        if (Math.hypot(dx, dy) < 10) group.push(j);
      });
      if (group.length > 1) {
        const avg = group.reduce(
          (a, k) => ({ x: a.x + markers[k].pos.left, y: a.y + markers[k].pos.top }),
          { x: 0, y: 0 },
        );
        out.push({
          x: avg.x / group.length,
          y: avg.y / group.length,
          ids: group.map((k) => markers[k].id),
        });
        group.forEach((k) => used.add(k));
      }
    });
    const singles = markers.filter((_, i) => !used.has(i));
    return { clusters: out, singles };
  }, [markers]);

  // Bottom sheet
  const y = useMotionValue(0);
  const sheetH = useTransform(y, (v) => `${Math.max(SNAPS.peek, SNAPS.half - v)}px`);
  const snapTo = (target: "peek" | "half" | "full") => {
    const delta = SNAPS.half - SNAPS[target];
    animate(y, delta, { type: "spring", stiffness: 300, damping: 34 });
  };

  // Sync carousel — flying to marker
  const scrollRef = useRef<HTMLDivElement>(null);
  const focusSalon = (id: string) => {
    setActive(id);
    const el = scrollRef.current?.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };
  const cycle = (dir: 1 | -1) => {
    if (filtered.length === 0) return;
    const idx = filtered.findIndex((s) => s.id === active);
    const next = filtered[(idx + dir + filtered.length) % filtered.length];
    focusSalon(next.id);
  };

  return (
    <div className="relative h-[calc(100dvh-68px-env(safe-area-inset-bottom))] overflow-hidden bg-surface lg:h-[100dvh]">
      {/* Fake map */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: -bearing }}
        transition={{ type: "spring", stiffness: 200, damping: 28 }}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(45deg, transparent 48%, oklch(0.92 0.018 85) 49%, oklch(0.92 0.018 85) 51%, transparent 52%), linear-gradient(-45deg, transparent 48%, oklch(0.92 0.018 85) 49%, oklch(0.92 0.018 85) 51%, transparent 52%), linear-gradient(0deg, oklch(0.945 0.014 85), oklch(0.945 0.014 85))",
            backgroundSize: "64px 64px, 64px 64px, 100% 100%",
          }}
        />

        {/* Heatmap blobs */}
        <AnimatePresence>
          {heatmap && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0"
            >
              {POSITIONS.map((p, i) => (
                <div
                  key={i}
                  className="absolute h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
                  style={{
                    top: `${p.top}%`,
                    left: `${p.left}%`,
                    background:
                      "radial-gradient(circle, rgba(255,80,40,0.6), rgba(255,180,0,0.35), transparent 70%)",
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Single markers */}
        {clusters.singles.map((s, i) => {
          const isActive = s.id === active;
          return (
            <motion.button
              key={s.id}
              initial={{ scale: 0, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 22, delay: i * 0.04 }}
              onClick={() => focusSalon(s.id)}
              style={{ top: `${s.pos.top}%`, left: `${s.pos.left}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              aria-label={s.name}
            >
              <div className="relative">
                {isActive && (
                  <motion.span
                    className="absolute inset-0 -m-2 rounded-full bg-foreground/20"
                    animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                )}
                <motion.div
                  animate={{ scale: isActive ? 1.15 : 1 }}
                  className={cn(
                    "relative grid place-items-center rounded-full text-background transition-colors",
                    isActive
                      ? "h-12 w-12 bg-foreground ring-4 ring-foreground/20"
                      : "h-9 w-9 bg-foreground/85",
                  )}
                >
                  <MapPin className="h-4 w-4 fill-background" strokeWidth={0} />
                </motion.div>
              </div>
              {isActive && (
                <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                  {shortPrice(s.priceFrom)}+
                </span>
              )}
            </motion.button>
          );
        })}

        {/* Clusters */}
        {clusters.clusters.map((c, i) => (
          <motion.button
            key={`c-${i}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            onClick={() => focusSalon(c.ids[0])}
            style={{ top: `${c.y}%`, left: `${c.x}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative grid h-14 w-14 place-items-center rounded-full bg-foreground text-background shadow-lg ring-4 ring-foreground/15">
              <span className="text-sm font-bold">{c.ids.length}</span>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* TOP search + tabs */}
      <div
        className="absolute inset-x-0 top-0 z-20 px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <div className="flex items-center gap-2 rounded-full bg-background px-4 py-3 shadow-lg">
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mounted ? (t("map.search") as string) : "Salon yoki manzil"}
            className="flex-1 bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
          />
          <button className="grid h-8 w-8 place-items-center rounded-full bg-surface active:scale-95">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex justify-center">
          <div className="relative inline-flex rounded-full bg-background p-1 shadow-md">
            {(["salons", "barbers"] as const).map((k) => {
              const isActive = tab === k;
              const fallback = k === "salons" ? "Salonlar" : "Ustalar";
              return (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={cn(
                    "relative rounded-full px-6 py-2 text-[12px] font-bold tracking-wide transition-colors",
                    isActive ? "text-background" : "text-foreground",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="map-tab-pill"
                      className="absolute inset-0 rounded-full bg-foreground"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10" suppressHydrationWarning>
                    {mounted ? (t(`map.${k}`) as string) : fallback}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Heatmap chip (top-left under header) */}
      <button
        onClick={() => setHeatmap((v) => !v)}
        className={cn(
          "absolute left-4 z-20 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-md transition-colors",
          heatmap ? "bg-foreground text-background" : "bg-background text-foreground",
        )}
        style={{ top: "calc(env(safe-area-inset-top) + 130px)" }}
      >
        <Flame className="h-3.5 w-3.5" />
        Issiq hudud
      </button>

      {/* FAB stack — right side, NO +/- zoom */}
      <div
        className="absolute right-4 z-20 flex flex-col gap-2"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 220px)" }}
      >
        <button
          onClick={() => setBearing((b) => (b === 0 ? 30 : 0))}
          className="grid h-11 w-11 place-items-center rounded-full bg-background shadow-md active:scale-95"
          aria-label="Compass"
        >
          <motion.div animate={{ rotate: -bearing }}>
            <Compass className="h-5 w-5" />
          </motion.div>
        </button>
        <button
          onClick={() => {
            setBearing(0);
            if (filtered[0]) focusSalon(filtered[0].id);
          }}
          className="grid h-11 w-11 place-items-center rounded-full bg-foreground text-background shadow-lg active:scale-95"
          aria-label="Recenter"
        >
          <Locate className="h-5 w-5" />
        </button>
      </div>

      {/* DRAGGABLE BOTTOM SHEET */}
      <motion.div
        drag="y"
        dragConstraints={{ top: -(SNAPS.full - SNAPS.half), bottom: SNAPS.half - SNAPS.peek }}
        dragElastic={0.05}
        style={{ y, height: sheetH }}
        onDragEnd={(_, info) => {
          const v = y.get();
          if (info.velocity.y < -500) snapTo("full");
          else if (info.velocity.y > 500) snapTo("peek");
          else if (v < -(SNAPS.full - SNAPS.half) / 2) snapTo("full");
          else if (v > (SNAPS.half - SNAPS.peek) / 2) snapTo("peek");
          else snapTo("half");
        }}
        className="absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl bg-background shadow-2xl"
      >
        <div
          className="flex shrink-0 cursor-grab flex-col items-center pt-3 pb-2 active:cursor-grabbing"
          onClick={() => snapTo(y.get() < 0 ? "half" : "full")}
        >
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          <div className="mt-2 flex w-full items-center justify-between px-5">
            <div>
              <h3 className="text-[15px] font-bold" suppressHydrationWarning>
                {salonsQuery.isLoading ? "..." : filtered.length} {mounted ? (t(tab === "salons" ? "map.salons" : "map.barbers") as string) : tab === "salons" ? "Salonlar" : "Ustalar"}
              </h3>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Yaqin atrofda
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); cycle(-1); }}
                className="grid h-8 w-8 place-items-center rounded-full bg-surface active:scale-95"
                aria-label="Prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); cycle(1); }}
                className="grid h-8 w-8 place-items-center rounded-full bg-surface active:scale-95"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); snapTo("full"); }}
                className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background active:scale-95"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal sync carousel (always visible in sheet) */}
        <div
          ref={scrollRef}
          className="no-scrollbar flex shrink-0 gap-3 overflow-x-auto px-4 pb-3 pt-1 snap-x snap-mandatory"
        >
          {filtered.length === 0 && !salonsQuery.isLoading && (
            <div className="w-full px-5 py-10 text-center text-sm font-bold text-muted-foreground">
              Xarita uchun salon topilmadi
            </div>
          )}
          {filtered.map((s) => {
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                data-id={s.id}
                onClick={() => focusSalon(s.id)}
                className={cn(
                  "snap-center flex w-[240px] shrink-0 items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                  isActive
                    ? "border-foreground bg-surface scale-[1.02] shadow-md"
                    : "border-border bg-background",
                )}
              >
                <div
                  className="h-12 w-12 shrink-0 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.85 0.04 ${(Number(s.id) * 80) % 360}), oklch(0.55 0.06 ${(Number(s.id) * 80 + 50) % 360}))`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-bold">{s.name}</h4>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold">
                    <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
                    {s.rating}
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{s.distanceKm} km</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Full list (visible when expanded) */}
        <div
          className="flex-1 overflow-y-auto border-t border-border px-4 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 100px)" }}
        >
          {filtered.map((s) => {
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                onClick={() => focusSalon(s.id)}
                className={cn(
                  "mb-2 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                  isActive ? "border-foreground bg-surface" : "border-border bg-background active:bg-surface",
                )}
              >
                <div
                  className="h-14 w-14 shrink-0 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.85 0.04 ${(Number(s.id) * 80) % 360}), oklch(0.55 0.06 ${(Number(s.id) * 80 + 50) % 360}))`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-bold">{s.name}</h4>
                  <p className="truncate text-[11px] font-medium text-muted-foreground">{s.address}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] font-bold">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
                      {s.rating}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span>{s.distanceKm} km</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{shortPrice(s.priceFrom)}+</span>
                  </div>
                </div>
                <Link
                  to="/salon/$id"
                  params={{ id: s.id }}
                  onClick={(e) => e.stopPropagation()}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background active:scale-95"
                >
                  <Navigation className="h-3.5 w-3.5" />
                </Link>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
