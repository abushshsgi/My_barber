"use client";

import { useState } from "react";
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
import { SalonCard } from "@/components/SalonCard";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchSalons } from "@/lib/salon-queries";
import { fetchBarbers } from "@/lib/barber-queries";
import { HomeLoginBanner } from "@/components/HomeLoginBanner";
import { BarberCard } from "@/components/BarberCard";

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

  const { data: salons = [], isLoading, error } = useQuery({
    queryKey: ["salons"],
    queryFn: fetchSalons,
  });

  const filtered = salons.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const { data: barbers = [], isLoading: loadingBarbers, error: barberError } = useQuery({
    queryKey: ["barbers"],
    queryFn: fetchBarbers,
  });

  const filteredBarbers = barbers.filter((b) => {
    const q = search.toLowerCase();
    return (
      (b.name || "").toLowerCase().includes(q) ||
      (b.location_text || "").toLowerCase().includes(q) ||
      (b.phone || "").toLowerCase().includes(q)
    );
  });

  const topRated = [...salons].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const premiumSalons = salons.filter((s) => s.isPremium);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <p className="text-destructive text-center">
          {(error as Error).message}. API manzili: env NEXT_PUBLIC_API_URL
        </p>
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

        <div className="relative px-5 pt-12 pb-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <p className="text-background/60 text-xs font-medium tracking-wider uppercase">
                Xush kelibsiz
              </p>
              <h1 className="text-2xl font-extrabold text-background tracking-tight mt-0.5">
                My<span className="text-accent">Barber</span>
              </h1>
            </div>
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="w-11 h-11 rounded-2xl gold-gradient flex items-center justify-center shadow-lg shadow-accent/30"
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
            <Search
              className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${
                isFocused ? "text-accent" : "text-background/40"
              }`}
            />
            <Input
              placeholder="Salon yoki sartarosh qidirish..."
              className="pl-11 pr-12 h-12 rounded-2xl bg-background/10 border-background/10 text-background placeholder:text-background/40 text-sm focus:bg-background/15 focus:ring-2 focus:ring-accent/40 focus:border-transparent transition-all duration-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-background/10 hover:bg-background/20 transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4 text-background/60" />
            </button>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="px-5 py-4"
      >
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
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
              className={`flex flex-col items-center gap-1.5 min-w-[64px] py-2.5 px-3 rounded-2xl transition-all duration-200 ${
                selectedCategory === cat.label
                  ? "bg-accent/15 ring-1 ring-accent/30"
                  : "bg-muted/50 hover:bg-muted"
              }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                {cat.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <div className="px-5 pb-2">
        <div className="flex gap-2 p-1 rounded-2xl bg-muted/50">
          <button
            type="button"
            onClick={() => setFeedTab("salons")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              feedTab === "salons" ? "bg-card text-foreground" : "text-muted-foreground"
            }`}
          >
            Salonlar
          </button>
          <button
            type="button"
            onClick={() => setFeedTab("barbers")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              feedTab === "barbers" ? "bg-card text-foreground" : "text-muted-foreground"
            }`}
          >
            Barberlar
          </button>
        </div>
      </div>

      {feedTab === "barbers" && (
        <div className="px-5 pb-6 space-y-3">
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
        <>
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
            <button type="button" className="text-xs text-accent font-medium flex items-center gap-0.5">
              Barchasi <ChevronRight className="h-3 w-3" />
            </button>
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
            <Link key={salon.id} href={`/salon/${salon.id}`} className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.06 }}
                whileTap={{ scale: 0.96 }}
                className="relative rounded-2xl overflow-hidden bg-muted/50 group"
              >
                <img
                  src={salon.coverImage}
                  alt={salon.name}
                  className="w-full h-20 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="p-2.5">
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center text-[10px] font-extrabold text-accent-foreground">
                    {i + 1}
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate">{salon.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="h-2.5 w-2.5 fill-accent text-accent" />
                    <span className="text-[10px] text-muted-foreground">{salon.rating}</span>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.section>

      <section className="px-5 pb-6">
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
              <p className="text-sm text-muted-foreground">Boshqa kalit so&apos;z bilan qidiring</p>
            </motion.div>
          )}
        </div>
      </section>
        </>
      )}
    </div>
  );
};

export default Index;
