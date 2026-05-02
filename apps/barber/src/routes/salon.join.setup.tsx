import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Scissors,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, getBarberAccessToken } from "@/lib/api";
import { extractApiError, parseJsonSafe } from "@/lib/auth-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/salon/join/setup")({
  component: SalonJoinSetupPage,
});

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

type DaySchedule = {
  day: (typeof WEEKDAYS)[number];
  open: boolean;
  from: string;
  to: string;
};

type OnboardingStatus = {
  is_complete?: boolean;
  required_next_path?: string | null;
  flow?: string | null;
  work_mode?: string;
  has_location?: boolean;
  has_membership_hours?: boolean;
  active_membership_id?: number | null;
  salon_id?: number | null;
};

type ScheduleApiRow = {
  id: number;
  weekday: number;
  open_time: string;
  close_time: string;
  is_day_off: boolean;
};

function normalizePhoneDigits(input: string) {
  return input.replace(/\D/g, "").slice(0, 9);
}

function formatPhone(digits: string) {
  const d = digits;
  if (d.length === 0) return "";
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)}-${d.slice(5, 7)}-${d.slice(7, 9)}`;
}

function unwrapResults<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object" && Array.isArray((body as { results?: T[] }).results)) {
    return (body as { results: T[] }).results;
  }
  return [];
}

function timeToHhMm(t: string) {
  const s = (t || "").trim();
  if (!s) return "09:00";
  return s.length >= 5 ? s.slice(0, 5) : s;
}

const STEP_META = [
  {
    title: "Barber profili",
    subtitle: "Ism, telefon va rasm — mijozlar sizni tanisin.",
    icon: User,
  },
  {
    title: "Joylashuv matni",
    subtitle: "Qaysi manzil / tuman atrofida ishlayotganingiz (masalan, salon yonida).",
    icon: MapPin,
  },
  {
    title: "Ish jadvali",
    subtitle: "Qaysi kunlari va qanday soatlarda band qabul qilasiz.",
    icon: Clock,
  },
] as const;

function SalonJoinSetupPage() {
  const navigate = useNavigate();
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  const [membershipId, setMembershipId] = useState<number | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [locationText, setLocationText] = useState("");

  const [schedule, setSchedule] = useState<DaySchedule[]>(
    WEEKDAYS.map((d, i) => ({
      day: d,
      open: i < 6,
      from: "09:00",
      to: "20:00",
    })),
  );

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!getBarberAccessToken()) {
        await navigate({ to: "/auth" });
        return;
      }
      setBooting(true);
      setBootError(null);
      try {
        const stRes = await apiFetch("/api/v1/barber/onboarding/status/");
        const stRaw = await parseJsonSafe(stRes);
        if (!alive) return;
        if (!stRes.ok) {
          setBootError(extractApiError(stRaw, "Onboarding holatini tekshirib boʻlmadi."));
          setBooting(false);
          return;
        }
        const st = stRaw as OnboardingStatus;

        if (st.is_complete) {
          await navigate({ to: "/barber" });
          return;
        }

        if (st.required_next_path && st.required_next_path !== "/salon/join/setup") {
          await navigate({ to: st.required_next_path });
          return;
        }

        const mid = typeof st.active_membership_id === "number" ? st.active_membership_id : null;
        if (mid == null) {
          await navigate({ to: "/salon/join" });
          return;
        }

        setMembershipId(mid);

        const meRes = await apiFetch("/api/v1/barber/auth/me/");
        const meRaw = await parseJsonSafe(meRes);
        if (!alive) return;
        if (!meRes.ok) {
          setBootError(extractApiError(meRaw, "Profilni yuklab boʻlmadi."));
          setBooting(false);
          return;
        }
        const me = meRaw as { full_name?: string; phone?: string };
        const full = ((me.full_name || "") as string).trim();
        const parts = full.split(/\s+/).filter(Boolean);
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
        let ph = ((me.phone || "") as string).replace(/\D/g, "");
        if (ph.startsWith("998")) ph = ph.slice(3);
        setPhoneDigits(ph.slice(0, 9));

        const profRes = await apiFetch("/api/v1/barber/profile/");
        const profRaw = await parseJsonSafe(profRes);
        if (!alive) return;
        if (profRes.ok && profRaw && typeof profRaw === "object") {
          const lt = (profRaw as { location_text?: string }).location_text || "";
          if (lt.trim()) setLocationText(lt.trim());
        }

        const schRes = await apiFetch(`/api/v1/schedules/?membership=${mid}`);
        const schRaw = await parseJsonSafe(schRes);
        if (!alive) return;
        if (schRes.ok) {
          const rows = unwrapResults<ScheduleApiRow>(schRaw);
          if (rows.length) {
            setSchedule((prev) =>
              prev.map((slot) => {
                const wd = WEEKDAYS.indexOf(slot.day);
                const hit = rows.find((r) => r.weekday === wd);
                if (!hit || hit.is_day_off) {
                  return { ...slot, open: !!hit && !hit.is_day_off };
                }
                return {
                  ...slot,
                  open: true,
                  from: timeToHhMm(hit.open_time),
                  to: timeToHhMm(hit.close_time),
                };
              }),
            );
          }
        }

        setBooting(false);
      } catch {
        if (!alive) return;
        setBootError("Tarmoq xatosi.");
        setBooting(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [navigate]);

  const stepOk = useMemo(() => {
    if (step === 0)
      return firstName.trim().length > 1 && lastName.trim().length > 1 && phoneDigits.length === 9;
    if (step === 1) return locationText.trim().length > 4;
    if (step === 2) return schedule.some((s) => s.open);
    return false;
  }, [step, firstName, lastName, phoneDigits, locationText, schedule]);

  const persistProfileStep = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const barberPhone = `+998${phoneDigits}`;
    if (avatarFile) {
      const body = new FormData();
      body.append("full_name", fullName);
      body.append("phone", barberPhone);
      body.append("avatar", avatarFile);
      const res = await apiFetch("/api/v1/barber/auth/me/", {
        method: "PATCH",
        body,
        headers: {},
      });
      const err = await parseJsonSafe(res);
      if (!res.ok) throw new Error(extractApiError(err, "Profilni saqlab boʻlmadi."));
    } else {
      const res = await apiFetch("/api/v1/barber/auth/me/", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName, phone: barberPhone }),
      });
      const err = await parseJsonSafe(res);
      if (!res.ok) throw new Error(extractApiError(err, "Profilni saqlab boʻlmadi."));
    }
  };

  const persistLocationStep = async () => {
    const res = await apiFetch("/api/v1/barber/profile/", {
      method: "PATCH",
      body: JSON.stringify({
        location_text: locationText.trim(),
      }),
    });
    const err = await parseJsonSafe(res);
    if (!res.ok) throw new Error(extractApiError(err, "Joylashuv matnini saqlab boʻlmadi."));
  };

  const replaceSchedules = useCallback(
    async (mid: number) => {
      const listRes = await apiFetch(`/api/v1/schedules/?membership=${mid}`);
      const listRaw = await parseJsonSafe(listRes);
      if (listRes.ok) {
        const existing = unwrapResults<{ id: number }>(listRaw);
        for (const row of existing) {
          await apiFetch(`/api/v1/schedules/${row.id}/`, { method: "DELETE" });
        }
      }

      const rows = schedule
        .filter((d) => d.open)
        .map((d) => ({
          membership: mid,
          weekday: WEEKDAYS.indexOf(d.day),
          open_time: d.from,
          close_time: d.to,
          is_day_off: false,
        }));

      for (const payload of rows) {
        const res = await apiFetch("/api/v1/schedules/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const errBody = await parseJsonSafe(res);
        if (!res.ok) {
          throw new Error(extractApiError(errBody, "Jadvalni saqlab boʻlmadi."));
        }
      }
    },
    [schedule],
  );

  const handleNext = async () => {
    setPageError(null);
    setBusy(true);
    try {
      if (step === 0) {
        await persistProfileStep();
        toast.success("Profil yangilandi.");
        setStep(1);
      } else if (step === 1) {
        await persistLocationStep();
        toast.success("Joylashuv saqlandi.");
        setStep(2);
      }
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "Xato");
      toast.error(e instanceof Error ? e.message : "Xato");
    } finally {
      setBusy(false);
    }
  };

  const handleFinish = async () => {
    if (membershipId == null) return;
    setPageError(null);
    setBusy(true);
    try {
      await replaceSchedules(membershipId);
      toast.success("Sozlamalar yakunlandi. Barber panel tayyor.");
      setSuccess(true);
      window.setTimeout(() => {
        void navigate({ to: "/barber" });
      }, 2400);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "Xato");
      toast.error(e instanceof Error ? e.message : "Xato");
    } finally {
      setBusy(false);
    }
  };

  const handleAvatar = (files: FileList | null) => {
    if (!files?.[0]) return;
    const f = files[0];
    if (!f.type.startsWith("image/")) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Yuklanmoqda...
        </div>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="min-h-screen bg-background p-8 max-w-lg mx-auto">
        <Alert variant="destructive">
          <AlertTitle>Xato</AlertTitle>
          <AlertDescription>{bootError}</AlertDescription>
        </Alert>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => void navigate({ to: "/salon/join" })}
        >
          Salon join
        </Button>
      </div>
    );
  }

  const MetaIcon = STEP_META[step]?.icon ?? User;

  return (
    <div className="min-h-screen bg-background text-foreground pb-28 pt-8 px-4 sm:px-6">
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
            <CheckCircle2 className="mx-auto size-14 text-green-600 dark:text-green-400" />
            <h2 className="mt-4 font-heading text-2xl font-semibold">Muvaffaqiyatli yakunlandi</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Akkaunt faol va barber panelga yo‘nalayapsiz...
            </p>
            <Loader2 className="mx-auto mt-6 size-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      )}

      <header className="mx-auto max-w-xl flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background">
            <Scissors className="size-4" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Salon ishchisi</p>
            <p className="text-sm font-semibold">Profilingizni yakunlash</p>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          Qadam {step + 1} / {STEP_META.length}
        </span>
      </header>

      <div className="mx-auto max-w-xl">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] mb-6">
          <MetaIcon className="size-8 shrink-0 text-foreground" />
          <div>
            <h1 className="font-heading text-lg font-semibold">{STEP_META[step].title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{STEP_META[step].subtitle}</p>
            <div className="mt-3 flex gap-1">
              {STEP_META.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full max-w-[4rem]",
                    i <= step ? "bg-foreground" : "bg-muted",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {pageError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{pageError}</AlertDescription>
          </Alert>
        )}

        {step === 0 && (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sj-first">Ism</Label>
                <Input
                  id="sj-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ali"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sj-last">Familiya</Label>
                <Input
                  id="sj-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Valiyev"
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3">
                <span className="text-sm text-muted-foreground shrink-0">+998</span>
                <input
                  className="flex-1 bg-transparent outline-none text-sm"
                  placeholder="99 123-45-67"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={formatPhone(phoneDigits)}
                  onChange={(e) => setPhoneDigits(normalizePhoneDigits(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rasm</Label>
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full overflow-hidden bg-muted shrink-0 ring-1 ring-border">
                  <img
                    src={avatarPreview || "https://i.pravatar.cc/120?img=33"}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatar(e.target.files)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="sj-loc">Joylashuv tavsifi</Label>
              <textarea
                id="sj-loc"
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Masalan: Yunusabad, Amir Temur ko‘chasi — Premium Barber Salon yonidan"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            {schedule.map((row) => (
              <div
                key={row.day}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center",
                  !row.open && "opacity-60",
                )}
              >
                <label className="flex flex-1 items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={row.open}
                    onChange={(e) =>
                      setSchedule((prev) =>
                        prev.map((r) => (r.day === row.day ? { ...r, open: e.target.checked } : r)),
                      )
                    }
                    className="rounded border-border"
                  />
                  <span className="font-medium">{WEEKDAY_LABELS[row.day]}</span>
                </label>
                {row.open && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="time"
                      value={row.from}
                      onChange={(e) =>
                        setSchedule((prev) =>
                          prev.map((r) => (r.day === row.day ? { ...r, from: e.target.value } : r)),
                        )
                      }
                      className="h-9 w-32"
                    />
                    <span className="text-muted-foreground text-sm">—</span>
                    <Input
                      type="time"
                      value={row.to}
                      onChange={(e) =>
                        setSchedule((prev) =>
                          prev.map((r) => (r.day === row.day ? { ...r, to: e.target.value } : r)),
                        )
                      }
                      className="h-9 w-32"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={busy || step === 0 || success}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ArrowLeft className="size-4" /> Orqaga
          </Button>
          {step < 2 ? (
            <Button
              type="button"
              disabled={busy || !stepOk || success}
              onClick={() => void handleNext()}
              className="gap-2"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saqlanmoqda...
                </>
              ) : (
                <>
                  Keyingisi <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={busy || !stepOk || success}
              onClick={() => void handleFinish()}
              className="gap-2"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Yakunlanmoqda...
                </>
              ) : (
                <>
                  Yakunlash <CheckCircle2 className="size-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
