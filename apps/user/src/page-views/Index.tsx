"use client";

import { useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Star,
  ChevronRight,
  Crown,
  Flame,
  TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SalonCard } from "@/components/SalonCard";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchSalons } from "@/lib/salon-queries";
import { fetchBarbers, type BarberExploreFilters } from "@/lib/barber-queries";
import { HomeLoginBanner } from "@/components/HomeLoginBanner";
import { getPublicApiBase } from "@/lib/api";
import { BarberCard } from "@/components/BarberCard";
import { UZ_REGIONS } from "@/lib/uz-regions";
import { Skeleton } from "@/components/ui/skeleton";

const categories = [
  { icon: "✂️", label: "Soch turmak" },
  { icon: "🧔", label: "Soqol" },
  { icon: "💆", label: "Massaj" },
  { icon: "🎨", label: "Rang" },
  { icon: "👑", label: "VIP" },
];

const Index = () => {
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [feedTab, setFeedTab] = useState<"salons" | "barbers">("salons");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftMin, setDraftMin] = useState("");
  const [draftMax, setDraftMax] = useState("");
  const [draftRating, setDraftRating] = useState("");
  const [draftRegion, setDraftRegion] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [applied, setApplied] = useState({
    min: "",
    max: "",
    rating: "",
    region: "",
    date: "",
  });

  const {
    data: salons = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["salons"],
    queryFn: fetchSalons,
    retry: false,
  });

  const filtered = salons.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const barberFilters = useMemo((): BarberExploreFilters => {
    const f: BarberExploreFilters = { work_mode: "independent" };
    if (applied.min) f.min_price = applied.min;
    if (applied.max) f.max_price = applied.max;
    if (applied.rating) f.min_rating = applied.rating;
    if (applied.region) f.region = applied.region;
    if (applied.date) f.available_date = applied.date;
    if (selectedCategory) f.service_q = selectedCategory;
    return f;
  }, [applied, selectedCategory]);

  const { data: barbers = [], isLoading: loadingBarbers, error: barberError } = useQuery({
    queryKey: ["barbers", barberFilters],
    queryFn: () => fetchBarbers(barberFilters),
    retry: false,
    enabled: feedTab === "barbers",
  });

  const filteredBarbers = barbers.filter((b) => {
    const q = search.toLowerCase();
    return (
      (b.name || "").toLowerCase().includes(q) ||
      (b.location_text || "").toLowerCase().includes(q) ||
      (b.phone || "").toLowerCase().includes(q)
    );
  });

  const applyFilters = () => {
    setApplied({
      min: draftMin.trim(),
      max: draftMax.trim(),
      rating: draftRating.trim(),
      region: draftRegion,
      date: draftDate,
    });
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setDraftMin("");
    setDraftMax("");
    setDraftRating("");
    setDraftRegion("");
    setDraftDate("");
    setApplied({ min: "", max: "", rating: "", region: "", date: "" });
  };

  const topRated = [...salons].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const premiumSalons = salons.filter((s) => s.isPremium);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative overflow-hidden px-5 pt-[max(2.75rem,env(safe-area-inset-top))] pb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/85" />
          <div className="relative space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-24 rounded-md bg-background/20" />
                <Skeleton className="h-8 w-40 rounded-lg bg-background/20" />
                <Skeleton className="h-3 w-full max-w-[220px] rounded-md bg-background/15" />
              </div>
              <Skeleton className="h-11 w-11 shrink-0 rounded-2xl bg-background/20" />
            </div>
            <Skeleton className="h-12 w-full rounded-2xl bg-background/15" />
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-xl bg-background/10" />
              <Skeleton className="h-9 flex-1 rounded-xl bg-background/10" />
            </div>
          </div>
        </div>
        <div className="px-5 pb-4 flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-[64px] shrink-0 rounded-2xl" />
          ))}
        </div>
        <div className="px-5 pb-3">
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
        <div className="px-5 space-y-3 pb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[116px] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 gap-4 text-center">
        <div className="rounded-2xl border border-border bg-card/80 p-6 max-w-md w-full card-shadow">
          <p className="text-destructive text-sm font-medium">
            {(error as Error).message}
          </p>
          <p className="text-muted-foreground text-xs mt-3 leading-relaxed">
            API: {getPublicApiBase()}
            {import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL
              ? ""
              : " — Deploy env’da API URL’ni o‘rnating."}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-5 w-full rounded-xl"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? "Yuklanmoqda…" : "Qayta urinish"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeLoginBanner />
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/85" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-accent/50 blur-2xl" />
        </div>

        <div className="relative px-5 pt-[max(2.75rem,env(safe-area-inset-top))] pb-7">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start justify-between gap-4 mb-6"
          >
            <div className="min-w-0 flex-1">
              <p className="text-background/60 text-xs font-medium tracking-wider uppercase">
                Xush kelibsiz
              </p>
              <h1 className="text-2xl font-extrabold text-background tracking-tight mt-0.5">
                My<span className="text-accent">Barber</span>
              </h1>
              <p className="text-background/55 text-sm mt-2 leading-snug max-w-[280px]">
                Yaqin salon va barberlarni toping — bron va chat bir joyda.
              </p>
              <Link
                href="/map"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-accent hover:text-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground rounded-lg px-1 -ml-1 py-0.5 transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                Xaritada ko‘rish
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="w-11 h-11 shrink-0 rounded-2xl gold-gradient flex items-center justify-center shadow-lg shadow-accent/30"
              aria-hidden
            >
              <span className="text-lg">✂</span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <label htmlFor="home-search" className="sr-only">
              Salon yoki sartarosh qidirish
            </label>
            <Search
              className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                isFocused ? "text-accent" : "text-background/40"
              }`}
              aria-hidden
            />
            <Input
              id="home-search"
              placeholder="Salon yoki sartarosh qidirish..."
              autoComplete="off"
              aria-label="Salon yoki sartarosh qidirish"
              className="pl-11 pr-12 h-12 rounded-2xl bg-background/10 border-background/10 text-background placeholder:text-background/40 text-sm focus:bg-background/15 focus:ring-2 focus:ring-accent/40 focus:border-transparent transition-all duration-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-background/10 hover:bg-background/20 transition-colors"
                  aria-label="Filtrlar"
                >
                  <SlidersHorizontal className="h-4 w-4 text-background/60" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Barber filtrlari</SheetTitle>
                  <p className="text-sm text-muted-foreground text-left font-normal">
                    API orq mustaqil barberlar ro‘yxati yangilanadi.
                  </p>
                </SheetHeader>
                <div className="mt-4 space-y-4 pb-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Min narx (so&apos;m)</Label>
                      <Input
                        inputMode="numeric"
                        className="mt-1 rounded-xl"
                        value={draftMin}
                        onChange={(e) => setDraftMin(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max narx</Label>
                      <Input
                        inputMode="numeric"
                        className="mt-1 rounded-xl"
                        value={draftMax}
                        onChange={(e) => setDraftMax(e.target.value)}
                        placeholder="∞"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Minimal reyting</Label>
                    <Input
                      inputMode="decimal"
                      className="mt-1 rounded-xl"
                      value={draftRating}
                      onChange={(e) => setDraftRating(e.target.value)}
                      placeholder="masalan 4"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hudud</Label>
                    <select
                      className="mt-1 flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                      value={draftRegion}
                      onChange={(e) => setDraftRegion(e.target.value)}
                    >
                      <option value="">Barcha</option>
                      {UZ_REGIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Bo‘sh kun (YYYY-MM-DD)</Label>
                    <Input
                      type="date"
                      className="mt-1 rounded-xl"
                      value={draftDate}
                      onChange={(e) => setDraftDate(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 rounded-xl gold-gradient text-gold-foreground border-0" onClick={applyFilters}>
                      Qo‘llash
                    </Button>
                    <Button variant="outline" className="rounded-xl" type="button" onClick={clearFilters}>
                      Tozalash
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="px-5 py-4"
      >
        <div
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory scroll-pl-5 -mx-5 px-5"
          aria-label="Xizmat turlari"
        >
          {categories.map((cat, i) => (
            <motion.button
              key={cat.label}
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.04 }}
              whileTap={{ scale: 0.92 }}
              onClick={() =>
                setSelectedCategory(selectedCategory === cat.label ? null : cat.label)
              }
              aria-pressed={selectedCategory === cat.label}
              className={`snap-start flex flex-col items-center gap-1.5 min-w-[68px] py-2.5 px-3 rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                selectedCategory === cat.label
                  ? "bg-accent/15 ring-1 ring-accent/30"
                  : "bg-muted/50 hover:bg-muted"
              }`}
            >
              <span className="text-xl" aria-hidden>
                {cat.icon}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                {cat.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <div className="px-5 pb-2">
        <div
          className="flex gap-2 p-1 rounded-2xl bg-muted/50 border border-border/40"
          role="tablist"
          aria-label="Ro‘yxat turi"
        >
          <button
            type="button"
            role="tab"
            id="tab-salons"
            aria-selected={feedTab === "salons"}
            aria-controls="feed-panel"
            onClick={() => setFeedTab("salons")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              feedTab === "salons"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground/90"
            }`}
          >
            Salonlar
          </button>
          <button
            type="button"
            role="tab"
            id="tab-barbers"
            aria-selected={feedTab === "barbers"}
            aria-controls="feed-panel"
            onClick={() => setFeedTab("barbers")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              feedTab === "barbers"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground/90"
            }`}
          >
            Barberlar
          </button>
        </div>
      </div>

      {feedTab === "barbers" && (
        <div
          id="feed-panel"
          role="tabpanel"
          aria-labelledby="tab-barbers"
          className="px-5 pb-6 space-y-3"
        >
          {loadingBarbers && <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>}
          {barberError && (
            <p className="text-sm text-destructive">{(barberError as Error).message}</p>
          )}
          {!loadingBarbers && !barberError && filteredBarbers.length === 0 && (
            <p className="text-sm text-muted-foreground">Barber topilmadi</p>
          )}
          {filteredBarbers.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <BarberCard barber={b} />
            </motion.div>
          ))}
        </div>
      )}

      {feedTab === "salons" && (
        <div
          id="feed-panel"
          role="tabpanel"
          aria-labelledby="tab-salons"
        >
      {premiumSalons.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-5 mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-accent" />
              <h2 className="text-base font-bold text-foreground">Premium salonlar</h2>
            </div>
            <Link
              href="/map"
              className="text-xs text-accent font-medium flex items-center gap-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 rounded-md px-1 py-0.5 -mr-1"
            >
              Barchasi <ChevronRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {premiumSalons.map((salon, i) => (
              <Link key={salon.id} href={`/salon/${salon.id}`}>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.08 }}
                  whileTap={{ scale: 0.96 }}
                  className="relative min-w-[220px] h-[140px] rounded-2xl overflow-hidden group"
                >
                  <img
                    src={salon.coverImage}
                    alt={salon.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute top-3 right-3 gold-gradient px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold text-gold-foreground">
                    <Crown className="h-2.5 w-2.5" /> Premium
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-white font-bold text-sm mb-0.5">{salon.name}</h3>
                    <div className="flex items-center gap-2 text-white/80 text-[11px]">
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-accent text-accent" /> {salon.rating}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" /> {salon.distance} km
                      </span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}
      

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-5 mb-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <h2 className="text-base font-bold text-foreground">Mashhur salonlar</h2>
          </div>
        </div>

        <div className="flex gap-2.5 mb-5">
          {topRated.map((salon, i) => (
            <Link key={salon.id} href={`/salon/${salon.id}`} className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.06 }}
                whileTap={{ scale: 0.96 }}
                className="relative rounded-2xl overflow-hidden bg-muted/50 group border border-border/30"
              >
                <div className="relative">
                  <img
                    src={salon.coverImage}
                    alt=""
                    className="w-full h-20 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-extrabold text-accent-foreground shadow-sm">
                    {i + 1}
                  </div>
                </div>
                <div className="p-2.5 pt-2">
                  <p className="text-xs font-semibold text-foreground truncate pl-0.5">{salon.name}</p>
                  <div className="flex items-center gap-1 mt-1 pl-0.5">
                    <Star className="h-2.5 w-2.5 fill-accent text-accent shrink-0" aria-hidden />
                    <span className="text-[10px] text-muted-foreground">{salon.rating}</span>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.section>

      <section className="px-5 pb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-accent" />
            <h2 className="text-base font-bold text-foreground">Barcha salonlar</h2>
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} ta</span>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((salon, i) => (
              <SalonCard key={salon.id} salon={salon} index={i} />
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
                <Search className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">Hech narsa topilmadi</p>
              <p className="text-sm text-muted-foreground">
                Filtrlarni tekshiring yoki boshqa nom bilan qidiring.
              </p>
            </motion.div>
          )}
        </div>
      </section>
        </div>
      )}
    </div>
  );
};

export default Index;
