import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import {
  MapPin,
  Star,
  Search,
  Navigation,
  Locate,
  ChevronUp,
  Compass,
  Flame,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Sparkles as SparklesIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { salons, shortPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Xarita — mysaloon.uz" },
      {
        name: "description",
        content: "Yaqin atrofdagi salonlar va ustalarni xaritada toping.",
      },
    ],
  }),
  component: MapView,
});

const SNAPS = { peek: 168, half: 380, full: 640 };

const POSITIONS = [
  { top: 28, left: 38 },
  { top: 42, left: 62 },
  { top: 36, left: 72 },
  { top: 56, left: 32 },
  { top: 62, left: 58 },
  { top: 48, left: 48 },
  { top: 30, left: 50 },
];

function MapView() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [tab, setTab] = useState<"salons" | "barbers">("salons");
  const [active, setActive] = useState(salons[0].id);
  const [query, setQuery] = useState("");
  const [heatmap, setHeatmap] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [radius, setRadius] = useState(5);

  const filtered = useMemo(() => {
    if (!query.trim()) return salons;
    const q = query.toLowerCase();
    return salons.filter(
      (s) => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q),
    );
  }, [query]);

  const markers = filtered.map((s, i) => ({ ...s, pos: POSITIONS[i % POSITIONS.length] }));

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

  const y = useMotionValue(0);
  const sheetH = useTransform(y, (v) => `${Math.max(SNAPS.peek, SNAPS.half - v)}px`);
  const snapTo = (target: "peek" | "half" | "full") => {
    const delta = SNAPS.half - SNAPS[target];
    animate(y, delta, { type: "spring", stiffness: 300, damping: 34 });
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const focusSalon = (id: string) => {
    setActive(id);
    const el = scrollRef.current?.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", inline: "center", block: "nearest" });
  };
  const cycle = (dir: 1 | -1) => {
    const idx = filtered.findIndex((s) => s.id === active);
    const next = filtered[(idx + dir + filtered.length) % filtered.length];
    focusSalon(next.id);
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-onyx text-ivory lg:h-[100dvh]">
      {/* Dark minimal map base */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: -bearing }}
        transition={{ type: "spring", stiffness: 200, damping: 28 }}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.05) 49%, rgba(255,255,255,0.05) 51%, transparent 52%), linear-gradient(-45deg, transparent 48%, rgba(255,255,255,0.05) 49%, rgba(255,255,255,0.05) 51%, transparent 52%), radial-gradient(circle at 30% 30%, oklch(0.20 0.012 270), oklch(0.135 0.005 270) 70%)",
            backgroundSize: "72px 72px, 72px 72px, 100% 100%",
          }}
        />

        {/* Concentric radius hint around center */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: `${Math.min(60 + radius * 4, 92)}%`,
            aspectRatio: "1",
            borderRadius: "9999px",
            border: "1px dashed color-mix(in oklch, var(--gold) 35%, transparent)",
            background:
              "radial-gradient(circle, rgba(212,175,55,0.05), transparent 70%)",
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
                      "radial-gradient(circle, rgba(212,175,55,0.55), rgba(255,180,0,0.25), transparent 70%)",
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Singles — luxury micro-pins */}
        {clusters.singles.map((s, i) => {
          const isActive = s.id === active;
          const initials = s.name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase();
          return (
            <motion.button
              key={s.id}
              initial={reduce ? undefined : { scale: 0, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 22, delay: i * 0.04 }}
              onClick={() => focusSalon(s.id)}
              style={{ top: `${s.pos.top}%`, left: `${s.pos.left}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              aria-label={s.name}
            >
              <div className="relative">
                {isActive && !reduce && (
                  <motion.span
                    className="absolute inset-0 -m-2 rounded-full bg-gold/30"
                    animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                )}
                <div
                  className={cn(
                    "relative grid place-items-center rounded-full font-bold tracking-tight transition-colors",
                    isActive
                      ? "h-12 w-12 bg-gold text-onyx ring-4 ring-gold/30 shadow-luxury"
                      : "h-10 w-10 bg-ivory text-onyx shadow-pill ring-2 ring-onyx/30",
                  )}
                >
                  <span className="text-[10px]">{initials}</span>
                </div>
              </div>
              {isActive && (
                <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-onyx px-2 py-0.5 text-[10px] font-bold text-gold ring-1 ring-gold/30">
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
            initial={reduce ? undefined : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            onClick={() => focusSalon(c.ids[0])}
            style={{ top: `${c.y}%`, left: `${c.x}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative grid h-14 w-14 place-items-center rounded-full bg-onyx text-gold shadow-luxury ring-4 ring-gold/30">
              <span className="font-display text-sm font-semibold">{c.ids.length}</span>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* TOP: glass search + tabs */}
      <div
        className="absolute inset-x-0 top-0 z-20 px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <div className="glass-dock flex items-center gap-2 rounded-full px-4 py-3 shadow-luxury">
          <Search className="h-4 w-4 text-foreground/70" strokeWidth={2.4} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mounted ? (t("map.search") as string) : "Salon yoki manzil"}
            className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={() => setHeatmap((v) => !v)}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full transition-colors active:scale-95",
              heatmap ? "bg-gold text-onyx" : "bg-foreground/10 text-foreground",
            )}
            aria-label="Issiq hudud"
          >
            <Flame className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex justify-center">
          <div className="glass-dock relative inline-flex rounded-full p-1 shadow-soft">
            {(["salons", "barbers"] as const).map((k) => {
              const isActive = tab === k;
              const fallback = k === "salons" ? "Salonlar" : "Ustalar";
              const Icon = k === "salons" ? SparklesIcon : Scissors;
              return (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={cn(
                    "relative inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-[12px] font-bold tracking-wide transition-colors",
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
                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                    <span suppressHydrationWarning>
                      {mounted ? (t(`map.${k}`) as string) : fallback}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Radius selector — floating left */}
      <div
        className="absolute left-4 z-20"
        style={{ top: "calc(env(safe-area-inset-top) + 132px)" }}
      >
        <div className="glass-dock flex w-[148px] items-center gap-2 rounded-full px-3 py-2 shadow-soft">
          <Locate className="h-3.5 w-3.5 text-gold" strokeWidth={2.4} />
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            aria-label="Qidiruv radiusi"
            className="h-1 flex-1 appearance-none rounded-full bg-foreground/15 accent-gold"
          />
          <span className="w-9 text-right text-[11px] font-bold tabular-nums text-foreground">
            {radius} km
          </span>
        </div>
      </div>

      {/* FAB stack — right */}
      <div
        className="absolute right-4 z-20 flex flex-col gap-2"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 220px)" }}
      >
        <button
          onClick={() => setBearing((b) => (b === 0 ? 30 : 0))}
          className="grid h-11 w-11 place-items-center rounded-full bg-background/90 text-foreground shadow-luxury ring-1 ring-foreground/10 backdrop-blur active:scale-95"
          aria-label="Compass"
        >
          <motion.div animate={{ rotate: -bearing }}>
            <Compass className="h-5 w-5" />
          </motion.div>
        </button>
        <button
          onClick={() => {
            setBearing(0);
            focusSalon(filtered[0].id);
          }}
          className="grid h-11 w-11 place-items-center rounded-full bg-gold text-onyx shadow-luxury active:scale-95"
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
        className="absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-[28px] bg-background text-foreground shadow-2xl ring-1 ring-foreground/5"
      >
        <div
          className="flex shrink-0 cursor-grab flex-col items-center pt-3 pb-2 active:cursor-grabbing"
          onClick={() => snapTo(y.get() < 0 ? "half" : "full")}
        >
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          <div className="mt-2 flex w-full items-center justify-between px-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
                Yaqin atrofda · {radius} km
              </p>
              <h3 className="font-display text-lg font-semibold tracking-tight" suppressHydrationWarning>
                {filtered.length} {mounted ? (t(tab === "salons" ? "map.salons" : "map.barbers") as string) : tab === "salons" ? "Salonlar" : "Ustalar"}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); cycle(-1); }}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface active:scale-95"
                aria-label="Prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); cycle(1); }}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface active:scale-95"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); snapTo("full"); }}
                className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background active:scale-95"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Luxury carousel */}
        <div
          ref={scrollRef}
          className="no-scrollbar flex shrink-0 gap-3 overflow-x-auto px-4 pb-3 pt-1 snap-x snap-mandatory"
        >
          {filtered.map((s) => {
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                data-id={s.id}
                onClick={() => focusSalon(s.id)}
                className={cn(
                  "snap-center relative flex w-[280px] shrink-0 overflow-hidden rounded-3xl text-left transition-all",
                  isActive
                    ? "scale-[1.02] ring-2 ring-gold shadow-luxury"
                    : "ring-1 ring-foreground/5 shadow-soft",
                )}
              >
                <div
                  className="h-[110px] w-[110px] shrink-0"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.78 0.05 ${(Number(s.id) * 80) % 360}), oklch(0.30 0.04 ${(Number(s.id) * 80 + 50) % 360}))`,
                  }}
                />
                <div className="flex min-w-0 flex-1 flex-col justify-between bg-background p-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gold">
                      {s.category}
                    </p>
                    <h4 className="mt-0.5 truncate font-display text-base font-semibold leading-tight">
                      {s.name}
                    </h4>
                    <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-semibold text-muted-foreground">
                      <MapPin className="h-3 w-3" strokeWidth={2.4} />
                      <span className="truncate">{s.address}</span>
                    </p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-1.5 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-gold text-gold" strokeWidth={0} />
                      {s.rating}
                      <span className="text-muted-foreground">· {s.distanceKm} km</span>
                    </span>
                    <span className="rounded-full bg-foreground px-2 py-0.5 text-background">
                      {shortPrice(s.priceFrom)}+
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Full list (visible when expanded) */}
        <div
          className="flex-1 overflow-y-auto border-t border-border px-4 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 120px)" }}
        >
          {filtered.map((s) => {
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                onClick={() => focusSalon(s.id)}
                className={cn(
                  "mb-2 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                  isActive
                    ? "border-gold bg-surface"
                    : "border-border bg-background active:bg-surface",
                )}
              >
                <div
                  className="h-14 w-14 shrink-0 rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.78 0.05 ${(Number(s.id) * 80) % 360}), oklch(0.30 0.04 ${(Number(s.id) * 80 + 50) % 360}))`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-bold">{s.name}</h4>
                  <p className="truncate text-[11px] font-medium text-muted-foreground">
                    {s.address}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] font-bold">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-gold text-gold" strokeWidth={0} />
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
