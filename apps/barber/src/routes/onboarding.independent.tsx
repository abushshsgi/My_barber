import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { readSignupDraft } from "@/lib/signup-draft";
import { submitFlowSignup, validateCoordinates } from "@/lib/barber-signup-flow";

export const Route = createFileRoute("/onboarding/independent")({
  component: IndependentOnboardingPage,
});

function IndependentOnboardingPage() {
  const navigate = useNavigate();
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!readSignupDraft()) {
      void navigate({ to: "/auth" });
    }
  }, [navigate]);

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
    const coordError = validateCoordinates(lat, lng);
    if (coordError) {
      setError(coordError);
      return;
    }
    setLoading(true);
    try {
      await submitFlowSignup("independent", {
        latitude: Number(lat),
        longitude: Number(lng),
      });
      await navigate({ to: "/independent/setup" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Mustaqil barber onboarding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Avval akkaunt yaratiladi, keyin mustaqil xizmat va jadval sozlash sahifasiga o'tasiz.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="indep-lat">Latitude</Label>
              <Input id="indep-lat" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="41.311..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="indep-lng">Longitude</Label>
              <Input id="indep-lng" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="69.279..." />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={requestLocation} className="w-full">
            Geolokatsiyani avtomatik olish
          </Button>
          <AuthErrorAlert error={error} />
          <Button type="submit" className="w-full h-11 bg-zinc-900 text-amber-100 hover:bg-zinc-800" disabled={loading}>
            {loading ? "Kutilmoqda..." : "Akkaunt yaratish"}
          </Button>
        </form>
      </div>
    </div>
  );
}

