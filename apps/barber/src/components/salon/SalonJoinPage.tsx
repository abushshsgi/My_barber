/**
 * Employee salon join flow (My_barber):
 * - UX: qidiruv-birinchi + URL ?salonId= taklifi + "Yaqin salonlar" (GPS → GET nearby).
 * - API: POST /api/v1/salons/join/ (salon_id + GPS), keyin membership uchun POST/PATCH /api/v1/schedules/.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Clock,
} from "lucide-react";
import { apiFetch, apiJson } from "@/lib/api";
import { extractApiError, parseJsonSafe } from "@/lib/auth-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEKDAY_LABELS: Record<(typeof WEEKDAYS)[number], string> = {
  Mon: "Dushanba",
  Tue: "Seshanba",
  Wed: "Chorshanba",
  Thu: "Payshanba",
  Fri: "Juma",
  Sat: "Shanba",
  Sun: "Yakshanba",
};

type SalonSearchHit = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type NearbyItem = {
  salon: {
    id: number;
    name: string;
    address?: string;
    latitude?: number | string;
    longitude?: number | string;
  };
  distance_km: number;
};

type OnboardingStatus = {
  is_complete?: boolean;
  required_next_path?: string | null;
  has_location?: boolean;
  active_membership_id?: number | null;
  salon_id?: number | null;
  has_membership_hours?: boolean;
};

type ScheduleApiRow = {
  id: number;
  membership: number;
  weekday: number;
  open_time: string;
  close_time: string;
  is_day_off: boolean;
};

type DaySchedule = {
  day: (typeof WEEKDAYS)[number];
  open: boolean;
  from: string;
  to: string;
};

async function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  const { getFastPosition } = await import("@mybarber/shared/geolocation");
  const pos = await getFastPosition({
    enableHighAccuracy: true,
    maximumAge: 60_000,
    timeout: 8_000,
    desiredAccuracyMeters: 120,
  });
  return { lat: pos.lat, lng: pos.lng };
}

function defaultSchedule(): DaySchedule[] {
  return WEEKDAYS.map((d, i) => ({
    day: d,
    open: i < 6,
    from: "09:00",
    to: "20:00",
  }));
}

type Props = {
  /** Taklif havolasi: /salon/join?salonId=12 */
  invitedSalonId?: number;
};

export function SalonJoinPage({ invitedSalonId }: Props) {
  const navigate = useNavigate();
  const [loadingGate, setLoadingGate] = useState(true);
  const [gateError, setGateError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);

  const [discoverTab, setDiscoverTab] = useState<"search" | "nearby">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchHits, setSearchHits] = useState<SalonSearchHit[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyHits, setNearbyHits] = useState<SalonSearchHit[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<SalonSearchHit | null>(null);

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [patchingLocation, setPatchingLocation] = useState(false);
  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultSchedule);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [existingSchedules, setExistingSchedules] = useState<ScheduleApiRow[]>([]);

  const refreshOnboarding = useCallback(async () => {
    const st = await apiJson<OnboardingStatus>("/api/v1/barber/onboarding/status/");
    setOnboarding(st);
    return st;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingGate(true);
      setGateError(null);
      try {
        await refreshOnboarding();
      } catch (e) {
        if (!alive) return;
        setGateError(e instanceof Error ? e.message : "Holatni yuklab bo‘lmadi.");
      } finally {
        if (alive) setLoadingGate(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshOnboarding]);

  /** Taklif: salonId URL dan — salonni yuklab tanlangan qilib qo‘yish. */
  useEffect(() => {
    if (!invitedSalonId || invitedSalonId < 1) return;
    let alive = true;
    (async () => {
      try {
        const s = await apiJson<{
          id: number;
          name: string;
          address?: string;
          latitude: number | string;
          longitude: number | string;
        }>(`/api/v1/salons/${invitedSalonId}/`);
        if (!alive) return;
        setSelectedSalon({
          id: s.id,
          name: s.name,
          address: (s.address || "").trim(),
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
        });
      } catch {
        /* salon topilmasa — foydalanuvchi qidiruvdan tanlaydi */
      }
    })();
    return () => {
      alive = false;
    };
  }, [invitedSalonId]);

  /** Qidiruv (debounce). */
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 1) {
      setSearchHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const hits = await apiJson<SalonSearchHit[]>(
            `/api/v1/salons/search/?q=${encodeURIComponent(q)}`,
          );
          setSearchHits(Array.isArray(hits) ? hits : []);
        } catch {
          setSearchHits([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 320);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const phase = useMemo(() => {
    if (loadingGate || gateError) return "gate";
    if (!onboarding) return "gate";
    if (onboarding.is_complete) return "done";
    if (onboarding.active_membership_id && !onboarding.has_membership_hours) return "hours";
    if (
      onboarding.active_membership_id &&
      onboarding.has_membership_hours &&
      onboarding.has_location === false
    ) {
      return "location_gap";
    }
    return "join";
  }, [loadingGate, gateError, onboarding]);

  const loadSchedulesForMembership = useCallback(async (mid: number) => {
    setHoursLoading(true);
    setHoursError(null);
    try {
      const rows = await apiJson<ScheduleApiRow[]>(`/api/v1/schedules/?membership=${mid}`);
      setExistingSchedules(Array.isArray(rows) ? rows : []);
      if (rows.length > 0) {
        const byDay = new Map(rows.map((r) => [r.weekday, r]));
        setSchedule(
          WEEKDAYS.map((d, i) => {
            const r = byDay.get(i);
            if (!r) return { day: d, open: false, from: "09:00", to: "18:00" };
            return {
              day: d,
              open: !r.is_day_off,
              from: String(r.open_time).slice(0, 5),
              to: String(r.close_time).slice(0, 5),
            };
          }),
        );
      } else {
        setSchedule(defaultSchedule());
      }
    } catch (e) {
      setHoursError(e instanceof Error ? e.message : "Jadval yuklanmadi.");
      setSchedule(defaultSchedule());
    } finally {
      setHoursLoading(false);
    }
  }, []);

  useEffect(() => {
    if (phase !== "hours" || !onboarding?.active_membership_id) return;
    void loadSchedulesForMembership(onboarding.active_membership_id);
  }, [phase, onboarding?.active_membership_id, loadSchedulesForMembership]);

  const patchProfileLocation = async (lat: number, lng: number) => {
    const res = await apiFetch("/api/v1/barber/profile/", {
      method: "PATCH",
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
      }),
    });
    const body = await parseJsonSafe(res);
    if (!res.ok) throw new Error(extractApiError(body, "Joylashuv saqlanmadi."));
  };

  const fixLocationFromGps = async () => {
    setJoinError(null);
    setPatchingLocation(true);
    try {
      const { lat, lng } = await getCurrentPosition();
      await patchProfileLocation(lat, lng);
      await refreshOnboarding();
      window.location.assign("/barber");
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Joylashuvni yangilab bo‘lmadi.");
    } finally {
      setPatchingLocation(false);
    }
  };

  const fetchNearby = async () => {
    setNearbyLoading(true);
    setJoinError(null);
    try {
      const { lat, lng } = await getCurrentPosition();
      const raw = await apiJson<NearbyItem[]>(
        `/api/v1/salons/nearby/?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}&radius_km=5`,
      );
      const mapped: SalonSearchHit[] = (Array.isArray(raw) ? raw : []).map((item) => {
        const s = item.salon;
        return {
          id: s.id,
          name: s.name,
          address: (s.address || "").trim(),
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
        };
      });
      setNearbyHits(mapped);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Yaqin salonlarni olishda xatolik.");
      setNearbyHits([]);
    } finally {
      setNearbyLoading(false);
    }
  };

  const runJoin = async () => {
    if (!selectedSalon) return;
    setJoining(true);
    setJoinError(null);
    try {
      const { lat, lng } = await getCurrentPosition();
      await apiJson<{ membership_id: number; salon_id: number; detail?: string }>(
        "/api/v1/salons/join/",
        {
          method: "POST",
          body: JSON.stringify({
            salon_id: selectedSalon.id,
            latitude: lat,
            longitude: lng,
          }),
        },
      );
      const st = await refreshOnboarding();
      if (st.has_membership_hours) {
        window.location.assign("/barber");
      }
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Qo‘shilish muvaffaqiyatsiz.");
    } finally {
      setJoining(false);
    }
  };

  const saveHours = async () => {
    const mid = onboarding?.active_membership_id;
    if (!mid) {
      setHoursError("Membership topilmadi.");
      return;
    }
    const openDays = schedule.filter((d) => d.open);
    if (openDays.length === 0) {
      setHoursError("Kamida bitta ish kuni tanlang.");
      return;
    }
    setHoursSaving(true);
    setHoursError(null);
    try {
      const byWeekday = new Map(existingSchedules.map((r) => [r.weekday, r]));
      for (let wi = 0; wi < WEEKDAYS.length; wi++) {
        const row = schedule[wi];
        if (!row) continue;
        const prev = byWeekday.get(wi);
        if (row.open) {
          const payload = {
            membership: mid,
            weekday: wi,
            open_time: row.from,
            close_time: row.to,
            is_day_off: false,
          };
          if (prev) {
            await apiJson(`/api/v1/schedules/${prev.id}/`, {
              method: "PATCH",
              body: JSON.stringify({
                open_time: row.from,
                close_time: row.to,
                is_day_off: false,
              }),
            });
          } else {
            await apiJson("/api/v1/schedules/", {
              method: "POST",
              body: JSON.stringify(payload),
            });
          }
        } else if (prev) {
          await apiJson(`/api/v1/schedules/${prev.id}/`, {
            method: "PATCH",
            body: JSON.stringify({ is_day_off: true }),
          });
        }
      }
      await refreshOnboarding();
      window.location.assign("/barber");
    } catch (e) {
      setHoursError(e instanceof Error ? e.message : "Saqlash muvaffaqiyatsiz.");
    } finally {
      setHoursSaving(false);
    }
  };

  if (loadingGate) {
    return (
      <div className="onboarding flex min-h-screen items-center justify-center bg-background px-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (gateError) {
    return (
      <div className="onboarding min-h-screen bg-background px-4 py-10">
        <div className="onboarding__container mx-auto w-full max-w-lg rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-destructive">{gateError}</p>
          <Button className="mt-4" variant="secondary" onClick={() => void navigate({ to: "/auth" })}>
            Auth sahifasiga
          </Button>
        </div>
      </div>
    );
  }

  if (!onboarding || phase === "gate") {
    return (
      <div className="onboarding flex min-h-screen items-center justify-center bg-background px-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="onboarding min-h-screen bg-background px-4 py-10">
        <div className="onboarding__container mx-auto w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto size-12 text-emerald-500" aria-hidden />
          <h1 className="onboarding__title mt-4 text-xl font-semibold">Tayyor</h1>
          <p className="onboarding__subtitle mt-2 text-sm text-muted-foreground">
            Salon bilan bog‘lanish va ish jadvali sozlangan.
          </p>
          <Button className="mt-6" onClick={() => void navigate({ to: "/barber" })}>
            Barber paneliga
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "location_gap") {
    return (
      <div className="onboarding min-h-screen bg-background px-4 py-10">
        <div className="onboarding__container mx-auto w-full max-w-lg space-y-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 px-0 text-muted-foreground"
            onClick={() => void navigate({ to: "/barber" })}
          >
            <ArrowLeft className="size-4" />
            Orqaga
          </Button>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Joylashuv kerak</CardTitle>
              <CardDescription>
                Salon va jadval sozlangan, lekin profilingizda GPS koordinatalari yo‘q. Onboardingni
                tugatish uchun joylashuvni bitta marta yangilang.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {joinError ? <p className="text-sm text-destructive">{joinError}</p> : null}
              <Button
                type="button"
                className="w-full gap-2"
                disabled={patchingLocation}
                onClick={() => void fixLocationFromGps()}
              >
                {patchingLocation ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
                GPS bilan joylashuvni saqlash
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "hours") {
    return (
      <div className="onboarding min-h-screen bg-background px-4 py-8 pb-28 sm:pb-10">
        <div className="onboarding__container mx-auto w-full max-w-lg">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="onboarding__back mb-4 gap-1 px-0 text-muted-foreground"
            onClick={() => void navigate({ to: "/barber" })}
          >
            <ArrowLeft className="size-4" />
            Orqaga
          </Button>
          <Card className="onboarding__section border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-primary" aria-hidden />
                <CardTitle className="text-lg">Ish jadvali</CardTitle>
              </div>
              <CardDescription>
                Bu salondagi ish vaqtingiz. Kamida bitta ochiq kun bo‘lishi kerak.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hoursLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="onboarding__field space-y-3">
                  {schedule.map((row, idx) => (
                    <div
                      key={row.day}
                      className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          id={`join-day-${row.day}`}
                          checked={row.open}
                          onCheckedChange={(v) =>
                            setSchedule((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, open: Boolean(v) } : p)),
                            )
                          }
                        />
                        <Label htmlFor={`join-day-${row.day}`} className="text-sm font-medium">
                          {WEEKDAY_LABELS[row.day]}
                        </Label>
                      </div>
                      {row.open ? (
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <Input
                            type="time"
                            name={`joinOpen_${row.day}`}
                            className="onboarding__input w-[7.5rem]"
                            value={row.from}
                            onChange={(e) =>
                              setSchedule((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, from: e.target.value } : p)),
                              )
                            }
                          />
                          <span className="text-muted-foreground">—</span>
                          <Input
                            type="time"
                            name={`joinClose_${row.day}`}
                            className="onboarding__input w-[7.5rem]"
                            value={row.to}
                            onChange={(e) =>
                              setSchedule((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, to: e.target.value } : p)),
                              )
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
              {hoursError ? <p className="onboarding__error text-sm text-destructive">{hoursError}</p> : null}
              <Button
                type="button"
                className="onboarding__btn onboarding__btn--primary w-full"
                disabled={hoursSaving || hoursLoading}
                onClick={() => void saveHours()}
              >
                {hoursSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saqlanmoqda…
                  </>
                ) : (
                  "Saqlash va davom etish"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* --- Join flow --- */
  return (
    <div className="onboarding min-h-screen bg-background px-4 py-8 pb-28 sm:pb-12">
      <div className="onboarding__container mx-auto w-full max-w-lg space-y-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="onboarding__back gap-1 px-0 text-muted-foreground"
          onClick={() => void navigate({ to: "/barber" })}
        >
          <ArrowLeft className="size-4" />
          Orqaga
        </Button>

        <div className="onboarding__header">
          <h1 className="onboarding__title text-2xl font-semibold tracking-tight">Salonga qo‘shilish</h1>
          <p className="onboarding__subtitle mt-2 text-sm text-muted-foreground">
            Salonni tanlang, keyin salon yoningizda ekaningizni GPS bilan tasdiqlang (taxminan 100 m ichida).
            {invitedSalonId ? " Havola orqali salon oldindan tanlangan." : ""}
          </p>
        </div>

        <div className="onboarding__progress flex gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">1. Salon</span>
          <span>→</span>
          <span className="rounded-full bg-muted px-2 py-0.5">2. GPS + qo‘shilish</span>
          <span>→</span>
          <span className="rounded-full bg-muted px-2 py-0.5">3. Jadval</span>
        </div>

        <Card className="onboarding__section border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4" />
              Salonni tanlang
            </CardTitle>
            <CardDescription>Qidiruv yoki yaqin salonlar ro‘yxatidan tanlang.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={discoverTab} onValueChange={(v) => setDiscoverTab(v as "search" | "nearby")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="search" className="gap-1">
                  <Search className="size-3.5" />
                  Qidiruv
                </TabsTrigger>
                <TabsTrigger value="nearby" className="gap-1">
                  <Navigation className="size-3.5" />
                  Yaqinlar
                </TabsTrigger>
              </TabsList>
              <TabsContent value="search" className="mt-4 space-y-3">
                <Label htmlFor="joinSalonSearch" className="sr-only">
                  Salon qidiruv
                </Label>
                <Input
                  id="joinSalonSearch"
                  name="joinSalonSearch"
                  placeholder="Salon nomi yoki manzil…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                />
                {searching ? (
                  <p className="text-xs text-muted-foreground">Qidirilmoqda…</p>
                ) : searchHits.length > 0 ? (
                  <ul className="onboarding__steps max-h-60 space-y-1 overflow-y-auto pr-1" role="listbox">
                    {searchHits.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          name={`joinPickSalon_${s.id}`}
                          className={cn(
                            "onboarding__step flex w-full flex-col rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                            selectedSalon?.id === s.id
                              ? "onboarding__step--active border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50",
                          )}
                          onClick={() => setSelectedSalon(s)}
                        >
                          <span className="font-medium">{s.name}</span>
                          {s.address ? (
                            <span className="text-xs text-muted-foreground">{s.address}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : searchQuery.trim().length >= 1 ? (
                  <p className="text-xs text-muted-foreground">Natija yo‘q.</p>
                ) : null}
              </TabsContent>
              <TabsContent value="nearby" className="mt-4 space-y-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full gap-2"
                  disabled={nearbyLoading}
                  onClick={() => void fetchNearby()}
                >
                  {nearbyLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MapPin className="size-4" />
                  )}
                  Joylashuvni olish va yaqin salonlar
                </Button>
                {nearbyHits.length > 0 ? (
                  <ul className="max-h-60 space-y-1 overflow-y-auto" role="listbox">
                    {nearbyHits.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          name={`joinPickNearby_${s.id}`}
                          className={cn(
                            "flex w-full flex-col rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                            selectedSalon?.id === s.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50",
                          )}
                          onClick={() => setSelectedSalon(s)}
                        >
                          <span className="font-medium">{s.name}</span>
                          {s.address ? (
                            <span className="text-xs text-muted-foreground">{s.address}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {selectedSalon ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tanlangan salon</CardTitle>
              <CardDescription>{selectedSalon.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Separator />
              <p className="text-xs text-muted-foreground">
                «Qo‘shilish» tugmasi joriy joylashuvingizni oladi va salon bilan masofani tekshiradi.
              </p>
              {joinError ? <p className="text-sm text-destructive">{joinError}</p> : null}
              <Button
                type="button"
                className="w-full gap-2"
                disabled={joining}
                onClick={() => void runJoin()}
              >
                {joining ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
                GPS bilan qo‘shilish
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
