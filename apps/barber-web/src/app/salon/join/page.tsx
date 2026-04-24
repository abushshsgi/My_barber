"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, MapPin } from "lucide-react";

export default function Page() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<
    { id: number; name: string; address: string; latitude: number; longitude: number }[]
  >([]);

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const canSearch = useMemo(() => q.trim().length >= 1, [q]);

  useEffect(() => {
    // Prefill location from barber profile (signup step 2 saved it)
    const run = async () => {
      const profRes = await apiFetch("/api/v1/barber/profile/");
      if (!profRes.ok) return;
      const p = (await profRes.json()) as { latitude?: string | null; longitude?: string | null };
      if (p.latitude) setLat((prev) => prev || String(p.latitude));
      if (p.longitude) setLng((prev) => prev || String(p.longitude));
    };
    void run();
  }, []);

  const search = async () => {
    setErr(null);
    if (!canSearch) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/salons/search/?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json().catch(() => ([]));
      if (!res.ok) {
        setErr(formatApiError(data, "Salon qidirilmadi"));
        return;
      }
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const join = async (salonId: number) => {
    setErr(null);
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) {
      setErr("Location (lat/lng) majburiy");
      return;
    }
    setJoining(salonId);
    try {
      const res = await apiFetch("/api/v1/salons/join/", {
        method: "POST",
        body: JSON.stringify({ salon_id: salonId, latitude: la, longitude: ln }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(formatApiError(data, "Salonga qo‘shilib bo‘lmadi"));
        return;
      }
      router.replace("/");
      router.refresh();
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-lg p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Salonga qo‘shilish</h1>
          <p className="text-sm text-muted-foreground">
            Salonni qidiring va joylashuvingiz yaqin bo‘lsa qo‘shiling (GPS tekshiruv).
          </p>
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="grid gap-2">
          <Label>Salon qidirish</Label>
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Salon nomi…"
              className="rounded-xl"
            />
            <Button onClick={search} disabled={loading || !canSearch} className="rounded-xl">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Latitude
            </Label>
            <Input value={lat} onChange={(e) => setLat(e.target.value)} className="rounded-xl" />
          </div>
          <div className="grid gap-1.5">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Longitude
            </Label>
            <Input value={lng} onChange={(e) => setLng(e.target.value)} className="rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Natija yo‘q. Qidiruv kiriting.</p>
          ) : (
            rows.map((s) => (
              <div key={s.id} className="glass-card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.address}</p>
                </div>
                <Button
                  onClick={() => void join(s.id)}
                  disabled={joining !== null}
                  className="rounded-xl"
                >
                  {joining === s.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining…
                    </>
                  ) : (
                    "Join"
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

