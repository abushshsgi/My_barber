"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Clock, MapPin } from "lucide-react";

type MembershipApi = {
  id: number;
  salon: number;
  salon_name: string;
  role: string;
  invite_state: string;
};

type ScheduleApi = {
  id: number;
  membership: number;
  weekday: number;
  open_time: string;
  close_time: string;
  is_day_off: boolean;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [membership, setMembership] = useState<MembershipApi | null>(null);

  const [locationText, setLocationText] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const [schedule, setSchedule] = useState<
    { weekday: number; id?: number; open_time: string; close_time: string; is_day_off: boolean }[]
  >(
    Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      open_time: "09:00",
      close_time: "18:00",
      is_day_off: weekday === 6,
    }))
  );

  const hasLocation = useMemo(() => {
    const la = Number(lat);
    const ln = Number(lng);
    return Number.isFinite(la) && Number.isFinite(ln) && la >= -90 && la <= 90 && ln >= -180 && ln <= 180;
  }, [lat, lng]);

  useEffect(() => {
    const run = async () => {
      setErr(null);
      setLoading(true);
      try {
        // Membership: owner or active employee.
        const memRes = await apiFetch("/api/v1/memberships/");
        if (memRes.ok) {
          const mems = (await memRes.json()) as MembershipApi[];
          const owner = mems.find((m) => m.role === "owner");
          const active = mems.find((m) => m.invite_state === "active");
          setMembership(owner || active || null);
        }

        // Barber profile location
        const profRes = await apiFetch("/api/v1/barber/profile/");
        if (profRes.ok) {
          const p = (await profRes.json()) as {
            location_text?: string;
            latitude?: string | null;
            longitude?: string | null;
          };
          setLocationText(p.location_text || "");
          setLat(p.latitude ? String(p.latitude) : "");
          setLng(p.longitude ? String(p.longitude) : "");
        }
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!membership) return;
      const res = await apiFetch(`/api/v1/schedules/?membership=${encodeURIComponent(String(membership.id))}`);
      if (!res.ok) return;
      const j = (await res.json()) as { results?: ScheduleApi[] } | ScheduleApi[];
      const rows = Array.isArray(j) ? j : j.results || [];
      if (!rows.length) return;
      setSchedule((prev) =>
        prev.map((d) => {
          const r = rows.find((x) => x.weekday === d.weekday);
          return r
            ? {
                weekday: r.weekday,
                id: r.id,
                open_time: r.open_time,
                close_time: r.close_time,
                is_day_off: r.is_day_off,
              }
            : d;
        })
      );
    };
    void run();
  }, [membership]);

  const save = async () => {
    setErr(null);
    if (!membership) {
      setErr("Salon membership topilmadi. Avval salonga uling yoki salon yarating.");
      return;
    }
    if (!hasLocation) {
      setErr("Location (lat/lng) majburiy.");
      return;
    }
    setSaving(true);
    try {
      // Save location
      const la = Number(lat);
      const ln = Number(lng);
      const profRes = await apiFetch("/api/v1/barber/profile/", {
        method: "PATCH",
        body: JSON.stringify({
          location_text: locationText,
          latitude: la,
          longitude: ln,
        }),
      });
      const profBody = await profRes.json().catch(() => ({}));
      if (!profRes.ok) {
        setErr(formatApiError(profBody, "Location saqlanmadi"));
        return;
      }

      // Save schedule: upsert per weekday
      for (const d of schedule) {
        const payload = {
          membership: membership.id,
          weekday: d.weekday,
          open_time: d.open_time,
          close_time: d.close_time,
          is_day_off: d.is_day_off,
        };
        const path = d.id ? `/api/v1/schedules/${d.id}/` : "/api/v1/schedules/";
        const res = await apiFetch(path, {
          method: d.id ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setErr(formatApiError(body, `Schedule saqlanmadi (${DAYS[d.weekday]})`));
          return;
        }
      }

      // Trigger guard refresh (onboarding status should become complete)
      router.replace("/");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-2xl p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Profile setup</h1>
          <p className="text-sm text-muted-foreground">
            Dashboard ochilishi uchun joylashuv va ish jadvalini kiriting.
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
                <MapPin className="h-4 w-4" /> Location
              </p>
              <div className="grid gap-2">
                <div className="grid gap-1.5">
                  <Label>Address / location text</Label>
                  <Input
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Latitude</Label>
                    <Input value={lat} onChange={(e) => setLat(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Longitude</Label>
                    <Input value={lng} onChange={(e) => setLng(e.target.value)} className="rounded-xl" />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" /> Working hours
              </p>

              {membership ? (
                <p className="text-xs text-muted-foreground">
                  Salon: <span className="font-medium text-foreground">{membership.salon_name}</span>
                </p>
              ) : (
                <p className="text-xs text-destructive">
                  Salon membership topilmadi. Avval salonga uling yoki salon yarating.
                </p>
              )}

              <div className="space-y-2">
                {schedule.map((d) => (
                  <div key={d.weekday} className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-sm w-12 text-muted-foreground">{DAYS[d.weekday]}</span>
                    <label className="text-xs text-muted-foreground flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={d.is_day_off}
                        onChange={(e) =>
                          setSchedule((prev) =>
                            prev.map((x) =>
                              x.weekday === d.weekday ? { ...x, is_day_off: e.target.checked } : x
                            )
                          )
                        }
                      />
                      Day off
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={d.open_time}
                        onChange={(e) =>
                          setSchedule((prev) =>
                            prev.map((x) =>
                              x.weekday === d.weekday ? { ...x, open_time: e.target.value } : x
                            )
                          )
                        }
                        disabled={d.is_day_off}
                        className="rounded-xl w-28"
                      />
                      <span className="text-xs text-muted-foreground">—</span>
                      <Input
                        value={d.close_time}
                        onChange={(e) =>
                          setSchedule((prev) =>
                            prev.map((x) =>
                              x.weekday === d.weekday ? { ...x, close_time: e.target.value } : x
                            )
                          )
                        }
                        disabled={d.is_day_off}
                        className="rounded-xl w-28"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={save}
              disabled={saving || !membership}
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
          </>
        )}
      </Card>
    </div>
  );
}

