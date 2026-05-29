import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { MapPin, Star, SlidersHorizontal, Search, Navigation, Plus, Minus, Locate, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { salons, shortPrice } from "@/lib/mock-data";
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

// Snap points (from bottom). User can drag between them.
const SNAPS = { peek: 140, half: 380, full: 640 };

function MapView() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"salons" | "barbers">("salons");
  const [active, setActive] = useState(salons[0].id);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim()) return salons;
    const q = query.toLowerCase();
    return salons.filter((s) => s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));
  }, [query]);

  const y = useMotionValue(0);
  const sheetH = useTransform(y, (v) => `${Math.max(SNAPS.peek, SNAPS.half - v)}px`);

  const snapTo = (target: "peek" | "half" | "full") => {
    const delta = SNAPS.half - SNAPS[target];
    animate(y, delta, { type: "spring", stiffness: 300, damping: 34 });
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-surface">
      {/* Fake map background */}
      <motion.div
        className="absolute inset-0"
        animate={{ scale: zoom }}
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
        {/* Markers */}
        {filtered.map((s, i) => {
          const positions = [
            { top: "28%", left: "38%" },
            { top: "42%", left: "62%" },
            { top: "56%", left: "32%" },
            { top: "62%", left: "58%" },
            { top: "36%", left: "72%" },
          ];
          const pos = positions[i % positions.length];
          const isActive = s.id === active;
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{ top: pos.top, left: pos.left }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              aria-label={s.name}
            >
              <motion.div
                animate={{ scale: isActive ? 1.15 : 1 }}
                className={cn(
                  "grid place-items-center rounded-full text-background transition-colors",
                  isActive
                    ? "h-12 w-12 bg-foreground ring-4 ring-foreground/20"
                    : "h-9 w-9 bg-foreground/85",
                )}
              >
                <MapPin className="h-4 w-4 fill-background" strokeWidth={0} />
              </motion.div>
              {isActive && (
                <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                  {shortPrice(s.priceFrom)}+
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* TOP: search + segmented tabs (ko'tarilgan) */}
      <div className="absolute inset-x-0 top-0 z-20 px-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        {/* Search bar */}
        <div className="flex items-center gap-2 rounded-full bg-background px-4 py-3 shadow-lg">
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("map.search") || "Salon yoki manzil"}
            className="flex-1 bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
          />
          <button className="grid h-8 w-8 place-items-center rounded-full bg-surface active:scale-95">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Segmented tabs — ko'tarilgan, search ostida */}
        <div className="mt-3 flex justify-center">
          <div className="relative inline-flex rounded-full bg-background p-1 shadow-md">
            {(["salons", "barbers"] as const).map((k) => {
              const isActive = tab === k;
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
                  <span className="relative z-10">{t(`map.${k}`)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Map controls (right side) */}
      <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
        <button
          onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
          className="grid h-10 w-10 place-items-center rounded-full bg-background shadow-md active:scale-95"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}
          className="grid h-10 w-10 place-items-center rounded-full bg-background shadow-md active:scale-95"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background shadow-md active:scale-95"
        >
          <Locate className="h-4 w-4" />
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
          // current position offset from "half"; negative = up
          if (info.velocity.y < -500) snapTo("full");
          else if (info.velocity.y > 500) snapTo("peek");
          else if (v < -(SNAPS.full - SNAPS.half) / 2) snapTo("full");
          else if (v > (SNAPS.half - SNAPS.peek) / 2) snapTo("peek");
          else snapTo("half");
        }}
        className="absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl bg-background shadow-2xl"
      >
        {/* Drag handle */}
        <div
          className="flex shrink-0 cursor-grab flex-col items-center pt-3 pb-2 active:cursor-grabbing"
          onClick={() => snapTo(y.get() < 0 ? "half" : "full")}
        >
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          <div className="mt-2 flex w-full items-center justify-between px-5">
            <div>
              <h3 className="text-[15px] font-bold">
                {filtered.length} {tab === "salons" ? t("map.salons") : t("map.barbers")}
              </h3>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Yaqin atrofda
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                snapTo("full");
              }}
              className="grid h-8 w-8 place-items-center rounded-full bg-surface active:scale-95"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div
          className="flex-1 overflow-y-auto px-4 pt-2"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 100px)" }}
        >
          {filtered.map((s) => {
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
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
