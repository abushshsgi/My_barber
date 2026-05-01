import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { apiFetch } from "@/lib/api";
import { extractApiError, parseJsonSafe } from "@/lib/auth-ui";

export const Route = createFileRoute("/independent/setup")({
  component: IndependentSetupPage,
});

function IndependentSetupPage() {
  const navigate = useNavigate();
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("45");
  const [weekday, setWeekday] = useState("1");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("20:00");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!serviceName.trim()) return setError("Xizmat nomini kiriting.");
    const priceNum = Number(servicePrice);
    const durationNum = Number(serviceDuration);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return setError("Xizmat narxini to'g'ri kiriting.");
    if (!Number.isFinite(durationNum) || durationNum <= 0) return setError("Davomiylikni to'g'ri kiriting.");
    const weekdayNum = Number(weekday);
    if (!Number.isFinite(weekdayNum) || weekdayNum < 0 || weekdayNum > 6) return setError("Weekday 0..6 bo'lishi kerak.");

    setLoading(true);
    try {
      const serviceRes = await apiFetch("/api/v1/barber/services/", {
        method: "POST",
        body: JSON.stringify({
          name: serviceName.trim(),
          price: priceNum,
          duration_minutes: durationNum,
          is_active: true,
        }),
      });
      const serviceBody = await parseJsonSafe(serviceRes);
      if (!serviceRes.ok) throw new Error(extractApiError(serviceBody, "Xizmat qo'shib bo'lmadi."));

      const hourRes = await apiFetch("/api/v1/barber/working-hours/", {
        method: "POST",
        body: JSON.stringify({
          weekday: weekdayNum,
          open_time: openTime,
          close_time: closeTime,
          is_day_off: false,
        }),
      });
      const hourBody = await parseJsonSafe(hourRes);
      if (!hourRes.ok) throw new Error(extractApiError(hourBody, "Ish vaqti saqlanmadi."));

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
        <h1 className="text-2xl font-semibold">Mustaqil profil sozlash</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kamida bitta xizmat va bitta ish vaqti qo'shing.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="rounded-xl border border-border p-4 space-y-3">
            <p className="text-sm font-medium">Xizmat</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ind-service-name">Nomi</Label>
                <Input
                  id="ind-service-name"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Haircut"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ind-service-price">Narx</Label>
                <Input
                  id="ind-service-price"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  placeholder="80000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ind-service-duration">Daqiqa</Label>
                <Input
                  id="ind-service-duration"
                  value={serviceDuration}
                  onChange={(e) => setServiceDuration(e.target.value)}
                  placeholder="45"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 space-y-3">
            <p className="text-sm font-medium">Ish vaqti</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ind-weekday">Hafta kuni (0-6)</Label>
                <Input id="ind-weekday" value={weekday} onChange={(e) => setWeekday(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ind-open">Ochilish</Label>
                <Input id="ind-open" type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ind-close">Yopilish</Label>
                <Input id="ind-close" type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
              </div>
            </div>
          </div>

          <AuthErrorAlert error={error} />
          <Button type="submit" className="w-full h-11 bg-zinc-900 text-amber-100 hover:bg-zinc-800" disabled={loading}>
            {loading ? "Saqlanmoqda..." : "Saqlash va davom etish"}
          </Button>
        </form>
      </div>
    </div>
  );
}

