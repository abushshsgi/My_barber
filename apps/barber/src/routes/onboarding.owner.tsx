import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { readSignupDraft } from "@/lib/signup-draft";
import { submitFlowSignup, validateCoordinates } from "@/lib/barber-signup-flow";

export const Route = createFileRoute("/onboarding/owner")({
  component: OwnerOnboardingPage,
});

function OwnerOnboardingPage() {
  const navigate = useNavigate();
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const draft = readSignupDraft();
    if (!draft) {
      void navigate({ to: "/auth" });
      return;
    }
    if (!shopName.trim()) setShopName(`${draft.full_name} Studio`);
  }, [navigate, shopName]);

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
    if (!shopName.trim()) {
      setError("Salon nomini kiriting.");
      return;
    }
    const coordError = validateCoordinates(lat, lng);
    if (coordError) {
      setError(coordError);
      return;
    }
    setLoading(true);
    try {
      await submitFlowSignup("owner", {
        latitude: Number(lat),
        longitude: Number(lng),
        shop_name: shopName.trim(),
        address: address.trim() || undefined,
      });
      await navigate({ to: "/salon/create" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Owner onboarding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Salon egasi sifatida ro'yxatdan o'ting. Keyingi bosqichda salon yaratishga o'tasiz.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="owner-shop-name">Salon nomi</Label>
            <Input
              id="owner-shop-name"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Masalan: Royal Cuts"
              className="h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-address">Manzil (ixtiyoriy)</Label>
            <Input
              id="owner-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Toshkent, ..."
              className="h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="owner-lat">Latitude</Label>
              <Input id="owner-lat" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="41.311..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-lng">Longitude</Label>
              <Input id="owner-lng" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="69.279..." />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={requestLocation} className="w-full">
            Geolokatsiyani avtomatik olish
          </Button>
          <AuthErrorAlert error={error} />
          <Button type="submit" className="w-full h-11 bg-zinc-900 text-amber-100 hover:bg-zinc-800" disabled={loading}>
            {loading ? "Kutilmoqda..." : "Davom etish"}
          </Button>
        </form>
      </div>
    </div>
  );
}

