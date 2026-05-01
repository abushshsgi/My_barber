import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { apiFetch } from "@/lib/api";
import { extractApiError, parseJsonSafe } from "@/lib/auth-ui";

type SearchRow = {
  id: number;
  name: string;
  address: string;
};

export const Route = createFileRoute("/salon/join")({
  component: SalonJoinPage,
});

function SalonJoinPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [salons, setSalons] = useState<SearchRow[]>([]);
  const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Brauzer geolokatsiyani qo'llamaydi.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude.toFixed(6)));
        setLng(String(pos.coords.longitude.toFixed(6)));
      },
      () => setError("Joylashuv olinmadi."),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const onSearch = async () => {
    setError(null);
    if (!query.trim()) {
      setSalons([]);
      return;
    }
    setSearching(true);
    try {
      const res = await apiFetch(`/api/v1/salons/search/?q=${encodeURIComponent(query.trim())}`);
      const body = await parseJsonSafe(res);
      if (!res.ok) throw new Error(extractApiError(body, "Salon qidirib bo'lmadi."));
      setSalons(Array.isArray(body) ? (body as SearchRow[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSearching(false);
    }
  };

  const onJoin = async () => {
    setError(null);
    if (!selectedSalonId) return setError("Salon tanlang.");
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return setError("Koordinatalarni kiriting.");
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/salons/join/", {
        method: "POST",
        body: JSON.stringify({
          salon_id: selectedSalonId,
          latitude: latNum,
          longitude: lngNum,
        }),
      });
      const body = await parseJsonSafe(res);
      if (!res.ok) throw new Error(extractApiError(body, "Salonga qo'shilib bo'lmadi."));
      await navigate({ to: "/barber" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Salonga qo'shilish</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mavjud salonni toping va joylashuvingizni tasdiqlab qo'shiling.
        </p>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-query">Salon qidirish</Label>
            <div className="flex gap-2">
              <Input
                id="join-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Salon nomi"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void onSearch();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={() => void onSearch()} disabled={searching}>
                {searching ? "..." : "Qidirish"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {salons.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`w-full rounded-xl border p-3 text-left ${selectedSalonId === s.id ? "border-foreground bg-muted" : "border-border"}`}
                onClick={() => setSelectedSalonId(s.id)}
              >
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.address}</p>
              </button>
            ))}
            {query.trim() && salons.length === 0 && <p className="text-sm text-muted-foreground">Salon topilmadi.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="join-lat">Latitude</Label>
              <Input id="join-lat" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="41.311..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-lng">Longitude</Label>
              <Input id="join-lng" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="69.279..." />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={requestLocation} className="w-full">
            Geolokatsiyani avtomatik olish
          </Button>

          <AuthErrorAlert error={error} />
          <Button type="button" className="w-full h-11 bg-zinc-900 text-amber-100 hover:bg-zinc-800" disabled={loading} onClick={() => void onJoin()}>
            {loading ? "Qo'shilmoqda..." : "Salonga qo'shilish"}
          </Button>
        </div>
      </div>
    </div>
  );
}

