"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Image as ImageIcon } from "lucide-react";

export default function Page() {
  const router = useRouter();
  const sp = useSearchParams();
  const preset = (sp.get("preset") || "").toLowerCase();
  const isMybarber = preset === "mybarber";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [barberName, setBarberName] = useState<string>("");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const [cover, setCover] = useState<File | null>(null);
  const [gallery, setGallery] = useState<File[]>([]);

  const canSubmit = useMemo(() => {
    const la = Number(lat);
    const ln = Number(lng);
    if (!name.trim()) return false;
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
    if (!(la >= -90 && la <= 90) || !(ln >= -180 && ln <= 180)) return false;
    return true;
  }, [name, lat, lng]);

  useEffect(() => {
    // Prefill barber name + location from backend profile (signup step-2 saved it).
    const run = async () => {
      const meRes = await apiFetch("/api/v1/barber/auth/me/");
      if (meRes.ok) {
        const me = (await meRes.json()) as { full_name?: string };
        const fn = (me.full_name || "").trim();
        if (fn) setBarberName(fn);
        if (isMybarber && fn) setName((prev) => prev || `MyBarber · ${fn}`);
      }
      const profRes = await apiFetch("/api/v1/barber/profile/");
      if (profRes.ok) {
        const p = (await profRes.json()) as {
          location_text?: string;
          latitude?: string | null;
          longitude?: string | null;
        };
        if (p.location_text) setAddress((prev) => prev || p.location_text);
        if (p.latitude) setLat((prev) => prev || String(p.latitude));
        if (p.longitude) setLng((prev) => prev || String(p.longitude));
      }
    };
    void run();
  }, [isMybarber]);

  const submit = async () => {
    setErr(null);
    if (!canSubmit) return;
    setLoading(true);
    try {
      const la = Number(lat);
      const ln = Number(lng);
      const res = await apiFetch("/api/v1/salons/", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          latitude: la,
          longitude: ln,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(formatApiError(body, "Salon yaratilmadi"));
        return;
      }
      const salonId = String((body as { id?: number }).id || "");
      if (!salonId) {
        setErr("Salon ID qaytmadi");
        return;
      }

      // Upload cover (optional)
      if (cover) {
        const fd = new FormData();
        fd.set("cover", cover);
        await apiFetch(`/api/v1/salons/${encodeURIComponent(salonId)}/upload_cover/`, {
          method: "POST",
          body: fd,
        });
      }

      // Upload gallery (optional)
      if (gallery.length) {
        const fd = new FormData();
        for (const f of gallery) fd.append("images", f);
        await apiFetch(`/api/v1/salons/${encodeURIComponent(salonId)}/add_images/`, {
          method: "POST",
          body: fd,
        });
      }

      // Next: owner must set up their own working hours (profile setup).
      router.replace("/profile/setup");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-lg p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">
            {isMybarber ? "MyBarber salon yaratish" : "Salon yaratish"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Salon egasi sifatida avval salonni oching (location + rasmlar). Keyin o‘zingiz uchun ish
            jadvalini kiritasiz.
          </p>
          {barberName && (
            <p className="text-xs text-muted-foreground">
              Barber: <span className="font-medium text-foreground">{barberName}</span>
            </p>
          )}
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Salon name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Salon nomi"
              readOnly={isMybarber && Boolean(name)}
              className="rounded-xl"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Manzil"
              className="rounded-xl"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Phone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 ..."
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Latitude
              </Label>
              <Input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="41.31"
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Longitude
              </Label>
              <Input
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="69.28"
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Cover image (optional)
            </Label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCover(e.target.files?.[0] || null)}
            />
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Gallery images (optional)
            </Label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setGallery(Array.from(e.target.files || []))}
            />
          </div>
        </div>

        <Button
          onClick={submit}
          disabled={loading || !canSubmit}
          className="w-full rounded-xl gold-gradient text-gold-foreground border-0"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Yaratilmoqda…
            </>
          ) : (
            "Salon yaratish"
          )}
        </Button>
      </Card>
    </div>
  );
}

