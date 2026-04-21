"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Scissors, Clock } from "lucide-react";

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [services, setServices] = useState<
    { id: number; name: string; price: string; duration_minutes: number; is_active: boolean }[]
  >([]);

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDuration, setNewDuration] = useState("");

  const [hours, setHours] = useState<
    { weekday: number; id?: number; open_time: string; close_time: string; is_day_off: boolean }[]
  >(Array.from({ length: 7 }, (_, weekday) => ({ weekday, open_time: "09:00", close_time: "18:00", is_day_off: weekday === 6 })));

  const canAddService = useMemo(() => {
    const d = Number(newDuration);
    const p = Number(newPrice);
    return newName.trim().length > 0 && Number.isFinite(d) && d > 0 && Number.isFinite(p) && p >= 0;
  }, [newName, newDuration, newPrice]);

  useEffect(() => {
    const run = async () => {
      setErr(null);
      setLoading(true);
      try {
        const sRes = await apiFetch("/api/v1/barber/services/");
        if (sRes.ok) {
          const j = (await sRes.json()) as { results?: any[] } | any[];
          const rows = Array.isArray(j) ? j : j.results || [];
          setServices(rows);
        }
        const hRes = await apiFetch("/api/v1/barber/working-hours/");
        if (hRes.ok) {
          const j = (await hRes.json()) as { results?: any[] } | any[];
          const rows = Array.isArray(j) ? j : j.results || [];
          if (rows.length) {
            setHours((prev) =>
              prev.map((d) => {
                const r = rows.find((x: any) => x.weekday === d.weekday);
                return r
                  ? { weekday: r.weekday, id: r.id, open_time: r.open_time, close_time: r.close_time, is_day_off: r.is_day_off, }
                  : d;
              })
            );
          }
        }
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const addService = async () => {
    setErr(null);
    if (!canAddService) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/v1/barber/services/", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          price: String(Number(newPrice)),
          duration_minutes: Number(newDuration),
          is_active: true,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(formatApiError(body, "Xizmat qo‘shilmadi"));
        return;
      }
      setNewName("");
      setNewPrice("");
      setNewDuration("");
      const sRes = await apiFetch("/api/v1/barber/services/");
      if (sRes.ok) {
        const j = (await sRes.json()) as { results?: any[] } | any[];
        const rows = Array.isArray(j) ? j : j.results || [];
        setServices(rows);
      }
    } finally {
      setSaving(false);
    }
  };

  const saveHours = async () => {
    setErr(null);
    setSaving(true);
    try {
      for (const d of hours) {
        const payload = {
          weekday: d.weekday,
          open_time: d.open_time,
          close_time: d.close_time,
          is_day_off: d.is_day_off,
          breaks: [],
        };
        const path = d.id ? `/api/v1/barber/working-hours/${d.id}/` : "/api/v1/barber/working-hours/";
        const res = await apiFetch(path, {
          method: d.id ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setErr(formatApiError(body, "Working hours saqlanmadi"));
          return;
        }
      }
      router.replace("/");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-3xl p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Mustaqil barber setup</h1>
          <p className="text-sm text-muted-foreground">
            Dashboard ochilishi uchun xizmatlar va ish jadvalini kiriting.
          </p>
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}

        {loading ? (
          <div className="glass-card p-8 text-center">
            <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : (
          <>
            <div className="glass-card p-5 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Scissors className="h-4 w-4" /> Services
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="grid gap-1.5 md:col-span-2">
                  <Label>Name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="rounded-xl" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Price</Label>
                  <Input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="rounded-xl" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Duration (min)</Label>
                  <Input value={newDuration} onChange={(e) => setNewDuration(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <Button onClick={addService} disabled={saving || !canAddService} className="rounded-xl">
                Add service
              </Button>

              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services yet.</p>
              ) : (
                <div className="space-y-2">
                  {services.filter((s) => s.is_active).map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm rounded-xl bg-muted/40 px-3 py-2">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground">
                        {s.duration_minutes} min · {s.price}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-5 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" /> Working hours
              </p>
              <div className="space-y-2">
                {hours.map((d) => (
                  <div key={d.weekday} className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-sm w-12 text-muted-foreground">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][d.weekday]}</span>
                    <label className="text-xs text-muted-foreground flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={d.is_day_off}
                        onChange={(e) => setHours((prev) => prev.map((x) => x.weekday === d.weekday ? { ...x, is_day_off: e.target.checked } : x))}
                      />
                      Day off
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={d.open_time}
                        onChange={(e) => setHours((prev) => prev.map((x) => x.weekday === d.weekday ? { ...x, open_time: e.target.value } : x))}
                        disabled={d.is_day_off}
                        className="rounded-xl w-28"
                      />
                      <span className="text-xs text-muted-foreground">—</span>
                      <Input
                        value={d.close_time}
                        onChange={(e) => setHours((prev) => prev.map((x) => x.weekday === d.weekday ? { ...x, close_time: e.target.value } : x))}
                        disabled={d.is_day_off}
                        className="rounded-xl w-28"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={saveHours}
                disabled={saving || services.filter((s) => s.is_active).length === 0}
                className="w-full rounded-xl gold-gradient text-gold-foreground border-0"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                  </>
                ) : (
                  "Finish setup"
                )}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

