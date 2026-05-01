import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { apiFetch } from "@/lib/api";
import { extractApiError, parseJsonSafe } from "@/lib/auth-ui";

export const Route = createFileRoute("/salon/create")({
  component: SalonCreatePage,
});

const DEFAULT_HOURS = [1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  open_time: "09:00",
  close_time: "20:00",
}));

function SalonCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [serviceName, setServiceName] = useState("Haircut");
  const [servicePrice, setServicePrice] = useState("80000");
  const [serviceDuration, setServiceDuration] = useState("45");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!name.trim()) return setError("Salon nomini kiriting.");
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return setError("Koordinata kiriting.");
    if (!serviceName.trim()) return setError("Kamida bitta xizmat nomini kiriting.");
    const priceNum = Number(servicePrice);
    const durNum = Number(serviceDuration);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return setError("Xizmat narxi noto'g'ri.");
    if (!Number.isFinite(durNum) || durNum <= 0) return setError("Xizmat davomiyligi noto'g'ri.");

    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/salons/", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || "",
          latitude: latNum,
          longitude: lngNum,
          address: address.trim() || "",
          phone: phone.trim() || "",
          premium: false,
          languages: [],
          closed_weekdays: [0],
          is_published: true,
          hours: DEFAULT_HOURS,
          services: [
            {
              name: serviceName.trim(),
              price: priceNum,
              duration_minutes: durNum,
            },
          ],
        }),
      });
      const body = await parseJsonSafe(res);
      if (!res.ok) throw new Error(extractApiError(body, "Salon yaratilmadi."));
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
        <h1 className="text-2xl font-semibold">Salon yaratish</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Owner/MyBarber oqimi uchun boshlang'ich salon ma'lumotlarini kiriting.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="salon-name">Salon nomi</Label>
            <Input id="salon-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Royal Cuts" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salon-description">Tavsif</Label>
            <Input id="salon-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Salon haqida qisqacha..." />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="salon-address">Manzil</Label>
              <Input id="salon-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Toshkent..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salon-phone">Telefon</Label>
              <Input id="salon-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="salon-lat">Latitude</Label>
              <Input id="salon-lat" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="41.311..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salon-lng">Longitude</Label>
              <Input id="salon-lng" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="69.279..." />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={requestLocation} className="w-full">
            Geolokatsiyani avtomatik olish
          </Button>

          <div className="rounded-xl border border-border p-4 space-y-3">
            <p className="text-sm font-medium">Boshlang'ich xizmat</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Service name" />
              <Input value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} placeholder="Price" />
              <Input value={serviceDuration} onChange={(e) => setServiceDuration(e.target.value)} placeholder="Duration (min)" />
            </div>
          </div>

          <AuthErrorAlert error={error} />
          <Button type="submit" className="w-full h-11 bg-zinc-900 text-amber-100 hover:bg-zinc-800" disabled={loading}>
            {loading ? "Yaratilmoqda..." : "Salon yaratish"}
          </Button>
        </form>
      </div>
    </div>
  );
}

