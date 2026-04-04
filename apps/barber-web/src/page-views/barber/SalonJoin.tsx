"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Store, ChevronLeft, Check } from "lucide-react";
import Link from "next/link";
import { searchSalonsForJoin, joinSalon, type SalonSearchHit } from "@/lib/salon-queries";
import { cn } from "@/lib/utils";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SalonJoin() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [results, setResults] = useState<SalonSearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selected, setSelected] = useState<SalonSearchHit | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (debouncedQ.trim().length < 1) {
        setResults([]);
        return;
      }
      setSearchLoading(true);
      setErr(null);
      try {
        const list = await searchSalonsForJoin(debouncedQ);
        if (!cancelled) setResults(list);
      } catch {
        if (!cancelled) setErr("Qidiruvda xato. Internetni tekshiring.");
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  const handleJoin = async () => {
    if (!selected) {
      setErr("Salonni tanlang.");
      return;
    }
    setErr(null);
    setJoinLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolokatsiya mavjud emas"));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        });
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      await joinSalon({
        salon_id: selected.id,
        latitude: lat,
        longitude: lng,
      });
      router.push("/");
    } catch (e: unknown) {
      const geo = e as { code?: number };
      if (geo?.code === 1) {
        setErr("Joylashuv ruxsati kerak — brauzer sozlamalaridan ruxsat bering.");
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        if (/location|match|must|salon|joylashuv|mos kel/i.test(msg)) {
          setErr(
            "Agar siz haqiqatan ham shu salonda ishlasangiz, joylashuvingiz salon manzili bilan mos kelishi kerak (taxminan 100 m)."
          );
        } else if (msg.toLowerCase().includes("timeout")) {
          setErr("Joylashuv olinmadi. Qayta urinib ko‘ring.");
        } else {
          setErr(msg || "Xato");
        }
      }
    } finally {
      setJoinLoading(false);
    }
  };

  const showDropdown = q.trim().length >= 1;

  return (
    <div className="min-h-screen bg-background px-5 pt-4 pb-28">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" className="rounded-xl shrink-0" asChild>
          <Link href="/">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-extrabold">Salonga qo‘shilish</h1>
          <p className="text-xs text-muted-foreground">Nom bo‘yicha qidiring va tanlang</p>
        </div>
      </div>

      {err && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2 mb-3">{err}</p>
      )}

      <Card className="relative p-4 rounded-2xl border border-border/60">
        <label className="text-xs font-medium text-muted-foreground">Salon nomi</label>
        <Input
          className="rounded-xl mt-1"
          placeholder="Masalan: Gold Barber"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSelected(null);
          }}
        />
        {searchLoading && (
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Qidirilmoqda...
          </div>
        )}
        {showDropdown && !searchLoading && results.length > 0 ? (
          <ul className="absolute left-4 right-4 top-full z-20 mt-1 max-h-56 overflow-auto rounded-xl border border-border bg-card shadow-lg">
            {results.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(s);
                    setQ(s.name);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-sm hover:bg-muted/80 flex items-start gap-2 border-b border-border/50 last:border-0",
                    selected?.id === s.id && "bg-accent/10"
                  )}
                >
                  <Store className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span>
                    <span className="font-medium block">{s.name}</span>
                    {s.address ? (
                      <span className="text-xs text-muted-foreground line-clamp-1">{s.address}</span>
                    ) : null}
                  </span>
                  {selected?.id === s.id && <Check className="h-4 w-4 text-accent shrink-0 ml-auto" />}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {showDropdown && !searchLoading && results.length === 0 && debouncedQ.trim().length >= 1 ? (
          <p className="text-xs text-muted-foreground mt-3">Hech narsa topilmadi</p>
        ) : null}
      </Card>

      <div className="mt-6 space-y-3">
        <Button
          className="w-full rounded-xl h-12 gold-gradient text-gold-foreground border-0"
          disabled={!selected || joinLoading}
          onClick={handleJoin}
        >
          {joinLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Qo‘shilmoqda...
            </>
          ) : (
            "Salonga qo‘shilish"
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Qo‘shilish paytida joylashuvingiz salon bilan 100 metr ichida bo‘lishi tekshiriladi.
        </p>
      </div>
    </div>
  );
}
