"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Search as SearchIcon } from "lucide-react";
import { Link, useRouter } from "@/navigation";
import { findBarbers, type BarberFindApi } from "@/lib/barber-queries";
import { searchSalons } from "@/lib/salon-queries";
import { SalonCardPremium } from "@/components/luxury/SalonCardPremium";
import { BarberCardPremium, type PremiumBarber } from "@/components/luxury/BarberCardPremium";
import { mediaSrc, PLACEHOLDER_AVATAR } from "@/lib/media";
import { NeoPage } from "@/components/neo/NeoPrimitives";
import { cn } from "@/lib/utils";

type SearchTab = "all" | "salons" | "barbers";
const MIN_LEN = 2;

function mapBarberFind(row: BarberFindApi): PremiumBarber {
  const kind = row.booking_kind === "salon" && row.salon_id ? "salon" : "independent";
  return {
    id: String(row.barber_id),
    name: row.name,
    avatar: mediaSrc(row.avatar, PLACEHOLDER_AVATAR),
    salonName: row.salon_name || row.location_text || "Mustaqil sartarosh",
    rating: Number(row.avg_rating) || 0,
    reviewCount: row.review_count || 0,
    lat: parseFloat(row.latitude || "0") || 0,
    lng: parseFloat(row.longitude || "0") || 0,
    bookingKind: kind,
    salonId: row.salon_id != null ? String(row.salon_id) : undefined,
  };
}

function readInitialQuery(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q")?.trim() || "";
}

export default function SearchPage() {
  const router = useRouter();
  const [input, setInput] = useState(readInitialQuery);
  const [debounced, setDebounced] = useState(readInitialQuery);
  const [tab, setTab] = useState<SearchTab>("all");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(input.trim()), 320);
    return () => window.clearTimeout(t);
  }, [input]);

  useEffect(() => {
    const q = debounced;
    const url = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
    window.history.replaceState(null, "", url);
  }, [debounced]);

  const canSearch = debounced.length >= MIN_LEN;

  const salonsQ = useQuery({
    queryKey: ["search-salons", debounced],
    queryFn: () => searchSalons(debounced),
    enabled: canSearch && tab !== "barbers",
    retry: false,
  });

  const barbersQ = useQuery({
    queryKey: ["search-barbers", debounced],
    queryFn: () => findBarbers(debounced),
    enabled: canSearch && tab !== "salons",
    retry: false,
  });

  const barbers = useMemo(
    () => (barbersQ.data ?? []).map(mapBarberFind),
    [barbersQ.data],
  );

  const loading = canSearch && (salonsQ.isFetching || barbersQ.isFetching);
  const error =
    (salonsQ.isError && salonsQ.error instanceof Error ? salonsQ.error.message : null) ||
    (barbersQ.isError && barbersQ.error instanceof Error ? barbersQ.error.message : null);

  const showSalons = tab !== "barbers";
  const showBarbers = tab !== "salons";
  const salonCount = salonsQ.data?.length ?? 0;
  const barberCount = barbers.length;
  const empty =
    canSearch &&
    !loading &&
    !error &&
    ((showSalons && salonCount === 0) || !showSalons) &&
    ((showBarbers && barberCount === 0) || !showBarbers) &&
    salonCount === 0 &&
    barberCount === 0;

  const submit = useCallback(() => {
    const v = input.trim();
    if (v.length < MIN_LEN) return;
    setDebounced(v);
  }, [input]);

  return (
    <NeoPage className="min-h-dvh pb-28">
      <header className="sticky top-0 z-20 border-b-2 border-border bg-background/95 px-4 pb-3 pt-safe backdrop-blur-md">
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Orqaga"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 border-border bg-surface shadow-soft"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <form
            className="neo-panel flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Salon yoki sartarosh nomi"
              autoFocus
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {loading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <button
                type="submit"
                className="shrink-0 rounded-md border-2 border-border bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground"
              >
                Qidirish
              </button>
            )}
          </form>
        </div>

        <div className="mt-3 inline-flex gap-1 rounded-lg bg-muted p-1">
          {(
            [
              ["all", "Hammasi"],
              ["salons", "Salonlar"],
              ["barbers", "Barberlar"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                tab === id
                  ? "bg-background text-foreground shadow-card"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 space-y-6">
        {!canSearch && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Qidirish uchun kamida {MIN_LEN} ta harf kiriting.
          </p>
        )}

        {error && (
          <p className="rounded-xl border-2 border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {empty && (
          <p className="text-center text-sm text-muted-foreground py-8">
            «{debounced}» bo‘yicha natija topilmadi.
          </p>
        )}

        {showSalons && canSearch && salonCount > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Salonlar ({salonCount})
            </h2>
            <div className="space-y-2">
              {salonsQ.data!.map((salon) => (
                <SalonCardPremium key={salon.id} salon={salon} layout="horizontal" />
              ))}
            </div>
          </section>
        )}

        {showBarbers && canSearch && barberCount > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Sartaroshlar ({barberCount})
            </h2>
            <div className="space-y-2">
              {barbers.map((barber) => (
                <BarberCardPremium key={barber.id} barber={barber} layout="horizontal" />
              ))}
            </div>
          </section>
        )}

        {canSearch && !loading && !empty && tab === "all" && (
          <p className="text-center">
            <Link
              to="/map"
              className="text-xs font-semibold text-muted-foreground underline underline-offset-4"
            >
              Xaritada yaqin atrofni ko‘rish
            </Link>
          </p>
        )}
      </main>
    </NeoPage>
  );
}
