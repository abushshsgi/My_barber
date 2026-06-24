import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SalonLocationPicker } from "@/components/map/SalonLocationPicker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Languages,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
} from "lucide-react";
import { toast } from "sonner";

import {
  parseSomDigits,
  SomPriceInput,
  validateServicePrice,
} from "@/components/barber/SomPriceInput";
import { apiFetch, getBarberAccessToken } from "@/lib/api";
import { extractApiError, parseJsonSafe } from "@/lib/auth-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/salon/join/setup")({
  component: SalonJoinSetupPage,
});

/* ============================================================
   Constants & types
   ============================================================ */

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

type ServiceRow = {
  id: string;
  name: string;
  price: string;
  duration: string;
};

const LANGUAGES = [
  { code: "uz", label: "O'zbek" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
] as const;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ============================================================
   Helpers
   ============================================================ */

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

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/* ============================================================
   Step metadata
   ============================================================ */

const STEP_META = [
  {
    group: "Profil",
    short: "Profil",
    title: "Barber profili",
    subtitle: "Ism, familiya, telefon va rasm — mijozlar sizni shu profil bilan ko‘radi.",
    icon: User,
  },
  {
    group: "Profil",
    short: "Lokatsiya",
    title: "Joylashuv tavsifi",
    subtitle: "Qaysi tuman / manzil atrofida ishlaysiz — masalan, salon yonida.",
    icon: MapPin,
  },
  {
    group: "Profil",
    short: "Xizmatlar",
    title: "Sizning xizmatlaringiz",
    subtitle: "Mijozlar buyurtma berishi mumkin bo‘lgan xizmatlar — salon yaratish oqimidagi kabi.",
    icon: Scissors,
  },
  {
    group: "Jadval",
    short: "Jadval",
    title: "Ish jadvali",
    subtitle: "Qaysi kunlari va qanday soatlarda mijoz qabul qilasiz?",
    icon: CalendarDays,
  },
  {
    group: "Tillar",
    short: "Tillar",
    title: "Muloqot tillari",
    subtitle: "Mijozlar bilan qaysi tillarda gaplasha olasiz?",
    icon: Languages,
  },
] as const;

const TOTAL_STEPS = STEP_META.length;

/* ============================================================
   Page
   ============================================================ */

function SalonJoinSetupPage() {
  const navigate = useNavigate();
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  const [membershipId, setMembershipId] = useState<number | null>(null);

  // Profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Location
  const [locationText, setLocationText] = useState("");

  // Schedule
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    WEEKDAYS.map((d, i) => ({
      day: d,
      open: i < 6,
      from: "09:00",
      to: "20:00",
    })),
  );

  const [services, setServices] = useState<ServiceRow[]>([
    { id: uid(), name: "", price: "", duration: "" },
  ]);
  const [languages, setLanguages] = useState<string[]>(["uz"]);

  // Wizard state
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /* --- Boot: hydrate from server --- */
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
        const me = meRaw as { full_name?: string; phone?: string; avatar?: string };
        const full = ((me.full_name || "") as string).trim();
        const parts = full.split(/\s+/).filter(Boolean);
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
        let ph = ((me.phone || "") as string).replace(/\D/g, "");
        if (ph.startsWith("998")) ph = ph.slice(3);
        setPhoneDigits(ph.slice(0, 9));
        if (me.avatar && typeof me.avatar === "string") {
          setAvatarPreview(me.avatar);
        }

        const profRes = await apiFetch("/api/v1/barber/profile/");
        const profRaw = await parseJsonSafe(profRes);
        if (!alive) return;
        if (profRes.ok && profRaw && typeof profRaw === "object") {
          const po = profRaw as {
            location_text?: string;
            spoken_languages?: string[];
          };
          const lt = po.location_text || "";
          if (lt.trim()) setLocationText(lt.trim());
          const langs = po.spoken_languages;
          if (Array.isArray(langs) && langs.length > 0) {
            const allowed = new Set<string>(LANGUAGES.map((l) => l.code));
            const next = langs.filter((c): c is string => typeof c === "string" && allowed.has(c));
            if (next.length > 0) setLanguages(next);
          }
        }

        const svcRes = await apiFetch("/api/v1/barber/services/");
        const svcRaw = await parseJsonSafe(svcRes);
        if (!alive) return;
        if (svcRes.ok) {
          const svcRows = unwrapResults<{
            id: number;
            name: string;
            price: string;
            duration_minutes: number;
          }>(svcRaw).filter((r) => r.name?.trim());
          if (svcRows.length > 0) {
            setServices(
              svcRows.map((r) => ({
                id: uid(),
                name: r.name.trim(),
                price: String(r.price ?? "").replace(/\D/g, "") || String(r.price ?? ""),
                duration: String(r.duration_minutes ?? ""),
              })),
            );
          }
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

  /* --- Step validation --- */
  const stepValid = useMemo(() => {
    return [
      // 0: Profile
      firstName.trim().length > 1 && lastName.trim().length > 1 && phoneDigits.length === 9,
      // 1: Location text
      locationText.trim().length > 4,
      // 2: Services can be skipped; dashboard checklist will keep booking disabled.
      true,
      // 3: Schedule can be skipped; dashboard checklist will keep booking disabled.
      true,
      // 4: Languages
      languages.length > 0,
    ];
  }, [firstName, lastName, phoneDigits, locationText, services, schedule, languages]);

  const isLast = step === TOTAL_STEPS - 1;
  const canNext = stepValid[step];
  const allValid = stepValid.every(Boolean);
  const isOptionalSetupStep = step === 2 || step === 3;

  /* --- Persistence helpers (preserve existing logic) --- */
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

  const persistServicesStep = async () => {
    const listRes = await apiFetch("/api/v1/barber/services/");
    const listRaw = await parseJsonSafe(listRes);
    if (listRes.ok) {
      const existing = unwrapResults<{ id: number }>(listRaw);
      for (const row of existing) {
        await apiFetch(`/api/v1/barber/services/${row.id}/`, { method: "DELETE" });
      }
    }
    for (const s of services) {
      const name = s.name.trim();
      if (!name) continue;
      const price = parseSomDigits(s.price);
      const priceError = validateServicePrice(price);
      if (priceError) {
        throw new Error(priceError);
      }
      const res = await apiFetch("/api/v1/barber/services/", {
        method: "POST",
        body: JSON.stringify({
          name,
          price,
          duration_minutes: Number(s.duration.replace(/\D/g, "")) || 0,
          is_active: true,
        }),
      });
      const errBody = await parseJsonSafe(res);
      if (!res.ok) {
        throw new Error(extractApiError(errBody, "Xizmatlarni saqlab boʻlmadi."));
      }
    }
  };

  const persistSpokenLanguages = async () => {
    const res = await apiFetch("/api/v1/barber/profile/", {
      method: "PATCH",
      body: JSON.stringify({
        spoken_languages: languages,
      }),
    });
    const err = await parseJsonSafe(res);
    if (!res.ok) throw new Error(extractApiError(err, "Tillarni saqlab boʻlmadi."));
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

  /* --- Step transitions --- */
  const goNext = async () => {
    if (!canNext || busy) return;
    setPageError(null);
    setBusy(true);
    try {
      if (step === 0) {
        await persistProfileStep();
        toast.success("Profil saqlandi.");
      } else if (step === 1) {
        await persistLocationStep();
        toast.success("Joylashuv saqlandi.");
      } else if (step === 2) {
        await persistServicesStep();
        toast.success("Xizmatlar saqlandi.");
      }
      setDirection(1);
      setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Xato";
      setPageError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (step === 0 || busy) return;
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const skipOptionalStep = () => {
    if (step === 2) {
      setServices([{ id: uid(), name: "", price: "", duration: "" }]);
    }
    if (step === 3) {
      setSchedule((prev) => prev.map((day) => ({ ...day, open: false })));
    }
    setDirection(1);
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinish = async () => {
    if (membershipId == null || busy) return;
    setPageError(null);
    setBusy(true);
    try {
      await persistSpokenLanguages();
      await replaceSchedules(membershipId);
      toast.success("Sozlamalar yakunlandi. Barber panel tayyor.");
      setSuccess(true);
      window.setTimeout(() => {
        void navigate({ to: "/barber" });
      }, 4000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Xato";
      setPageError(msg);
      toast.error(msg);
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

  const updateService = (id: string, key: keyof Omit<ServiceRow, "id">, value: string) =>
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: value } : s)));

  const addService = () =>
    setServices((prev) => [...prev, { id: uid(), name: "", price: "", duration: "" }]);

  const removeService = (id: string) =>
    setServices((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));

  const toggleLanguage = (code: string) =>
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );

  const applyServicePreset = (p: { name: string; price: string; duration: string }) => {
    setServices((prev) => {
      const empty = prev.find((s) => !s.name && !s.price && !s.duration);
      if (empty) {
        return prev.map((s) =>
          s.id === empty.id ? { ...s, name: p.name, price: p.price, duration: p.duration } : s,
        );
      }
      return [...prev, { id: uid(), name: p.name, price: p.price, duration: p.duration }];
    });
  };

  /* --- Boot states --- */
  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Yuklanmoqda...
        </div>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="mx-auto min-h-screen max-w-lg bg-background p-8">
        <div className="flex items-start gap-2.5 rounded-2xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Xato</p>
            <p className="mt-0.5 text-[12.5px]">{bootError}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void navigate({ to: "/salon/join" })}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-[var(--transition-smooth)] hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" /> Salon join
        </button>
      </div>
    );
  }

  const currentMeta = STEP_META[step];

  return (
    <div className="min-h-screen bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-foreground sm:pb-32">
      {/* Success overlay */}
      <AnimatePresence>
        {success && (
          <SuccessOverlay
            barberName={`${firstName} ${lastName}`.trim()}
            onContinue={() => void navigate({ to: "/barber" })}
          />
        )}
      </AnimatePresence>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[920px] items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground sm:h-8 sm:w-8">
              <Scissors className="h-3.5 w-3.5 text-background sm:h-4 sm:w-4" />
            </div>
            <span className="text-[13px] font-semibold tracking-tight sm:text-sm">
              Barber Studio
            </span>
          </div>
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground sm:text-xs">
            <span className="text-foreground">{step + 1}</span>
            <span className="opacity-50"> / {TOTAL_STEPS}</span>
          </span>
        </div>
        <StepIndicator
          step={step}
          stepValid={stepValid}
          onJump={(i) => {
            if (i === step || busy) return;
            if (i < step) {
              setDirection(-1);
              setStep(i);
            } else {
              const canReach = stepValid.slice(0, i).every(Boolean);
              if (!canReach) return;
              setDirection(1);
              setStep(i);
            }
          }}
        />
      </header>

      <main className="mx-auto max-w-[920px] px-3.5 pt-5 sm:px-6 sm:pt-14">
        {/* Animated hero */}
        <div className="mb-5 overflow-hidden text-center sm:mb-10">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`hero-${step}`}
              custom={direction}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:mb-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground text-background sm:h-4 sm:w-4">
                  <currentMeta.icon className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                </span>
                {currentMeta.group} · Qadam {step + 1}
              </div>
              <h1 className="onboarding-title text-foreground">
                {currentMeta.title}
              </h1>
              <p className="mx-auto mt-2 max-w-[520px] px-1 text-[12.5px] leading-snug text-muted-foreground sm:mt-3 sm:px-0 sm:text-base">
                {currentMeta.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 60 : -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -60 : 60 }}
            transition={{ duration: 0.36, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-4 sm:space-y-6"
          >
            {step === 0 && (
              <BarberProfileStep
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                phoneDigits={phoneDigits}
                setPhoneDigits={setPhoneDigits}
                avatar={avatarPreview}
                handleAvatarFile={handleAvatar}
              />
            )}
            {step === 1 && <LocationStep value={locationText} onChange={setLocationText} />}
            {step === 2 && (
              <JoinServicesStep
                services={services}
                addService={addService}
                removeService={removeService}
                updateService={updateService}
                applyPreset={applyServicePreset}
              />
            )}
            {step === 3 && <ScheduleStep schedule={schedule} setSchedule={setSchedule} />}
            {step === 4 && (
              <JoinLanguagesStep languages={languages} toggleLanguage={toggleLanguage} />
            )}
          </motion.div>
        </AnimatePresence>

        {pageError && (
          <div className="mt-4 sm:mt-6">
            <div className="flex items-start gap-2.5 rounded-2xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-[12.5px] font-semibold sm:text-sm">Xato</p>
                <p className="mt-0.5 text-[11.5px] sm:text-[12.5px]">{pageError}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[920px] items-center justify-between gap-2 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:gap-3 sm:px-6 sm:py-4">
          <button
            onClick={goBack}
            disabled={step === 0 || busy || success}
            className={cn(
              "inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-[var(--transition-smooth)] sm:h-11 sm:w-auto sm:px-4",
              step === 0 || busy || success
                ? "cursor-not-allowed opacity-40"
                : "hover:bg-muted active:scale-[0.98]",
            )}
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Orqaga</span>
          </button>

          <div className="hidden flex-1 items-center justify-center gap-2 text-xs sm:flex">
            <span className="text-muted-foreground">Hozirgi qadam:</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={`crumb-${step}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 font-semibold text-foreground"
              >
                <currentMeta.icon className="h-3 w-3" />
                {currentMeta.short}
              </motion.span>
            </AnimatePresence>
          </div>

          {isOptionalSetupStep && (
            <button
              type="button"
              onClick={skipOptionalStep}
              disabled={busy || success}
              className="inline-flex h-11 items-center rounded-xl border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50 sm:px-4 sm:text-sm"
            >
              Keyinroq
            </button>
          )}

          {!isLast ? (
            <button
              onClick={() => void goNext()}
              disabled={!canNext || busy}
              className={cn(
                "group inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-[var(--transition-smooth)] sm:h-11 sm:flex-none sm:min-w-[170px] sm:text-sm",
                canNext && !busy
                  ? "bg-foreground text-background hover:scale-[1.02] active:scale-[0.98]"
                  : "cursor-not-allowed bg-muted text-muted-foreground",
              )}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saqlanmoqda…
                </>
              ) : (
                <>
                  Keyingisi
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={!allValid || busy || success}
              onClick={() => void handleFinish()}
              className={cn(
                "inline-flex h-11 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl px-4 text-[13px] font-semibold transition-[var(--transition-smooth)] sm:h-11 sm:flex-none sm:min-w-[170px] sm:text-sm",
                allValid && !busy && !success
                  ? "bg-foreground text-background hover:scale-[1.02] active:scale-[0.98]"
                  : "cursor-not-allowed bg-muted text-muted-foreground",
              )}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Yakunlanmoqda…
                </>
              ) : success ? (
                <>
                  <Check className="h-4 w-4" /> Yakunlandi
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Yakunlash
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Step 0 — Barber profile (avatar + names + phone)
   ============================================================ */

function BarberProfileStep(props: {
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  phoneDigits: string;
  setPhoneDigits: (v: string) => void;
  avatar: string | null;
  handleAvatarFile: (f: FileList | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const initials = (props.firstName.trim()[0] || "") + (props.lastName.trim()[0] || "");
  return (
    <Section
      icon={<User className="h-4 w-4" />}
      label="Shaxsiy"
      title="Barber haqida"
      description="Mijozlar sizni shu ism va rasm bilan ko‘radi."
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="relative">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              props.handleAvatarFile(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-2xl font-semibold uppercase text-muted-foreground transition-[var(--transition-smooth)] hover:border-foreground sm:h-28 sm:w-28"
          >
            {props.avatar ? (
              <img src={props.avatar} alt="avatar" className="h-full w-full object-cover" />
            ) : initials.trim() ? (
              <span className="text-foreground">{initials}</span>
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
            <span className="absolute inset-x-0 bottom-0 translate-y-full bg-foreground py-1 text-[10px] font-medium uppercase tracking-wider text-background transition-transform group-hover:translate-y-0">
              {props.avatar ? "O'zgartirish" : "Rasm yuklash"}
            </span>
          </button>
        </div>
        <div className="grid w-full flex-1 gap-3 sm:grid-cols-2">
          <FloatingInput
            label="Ism"
            required
            value={props.firstName}
            onChange={props.setFirstName}
          />
          <FloatingInput
            label="Familiya"
            required
            value={props.lastName}
            onChange={props.setLastName}
          />
          <div className="sm:col-span-2">
            <PhoneInput
              label="Telefon raqami"
              required
              digits={props.phoneDigits}
              onChange={props.setPhoneDigits}
            />
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ============================================================
   Step 1 — Location text
   ============================================================ */

function LocationStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  return (
    <Section
      icon={<MapPin className="h-4 w-4" />}
      label="Lokatsiya"
      title="Joylashuv tavsifi"
      description="Salon yonida qaysi tuman/ko‘chada ishlaysiz — mijoz tanish uchun."
    >
      <SalonLocationPicker
        address={value}
        latitude={latitude}
        longitude={longitude}
        setLatitude={setLatitude}
        setLongitude={setLongitude}
        setAddress={onChange}
      />

      <FloatingTextarea
        label="Joylashuv tavsifi"
        value={value}
        onChange={onChange}
        rows={4}
        placeholder="Masalan: Yunusabad, Amir Temur ko‘chasi — Premium Barber Salon yonidan"
      />

      <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-3.5 py-3 text-[12px] leading-snug text-muted-foreground">
        <p className="font-semibold text-foreground">Eslatma</p>
        <p className="mt-0.5">
          Kamida 5 ta belgi yozing. Bu matn mijozlar uchun yo‘nalish sifatida ko‘rinadi va qidiruvga
          yordam beradi.
        </p>
      </div>
    </Section>
  );
}

/* ============================================================
   Step 2 — Schedule
   ============================================================ */

function ScheduleStep({
  schedule,
  setSchedule,
}: {
  schedule: DaySchedule[];
  setSchedule: React.Dispatch<React.SetStateAction<DaySchedule[]>>;
}) {
  return (
    <Section
      icon={<CalendarDays className="h-4 w-4" />}
      label="Jadval"
      title="Ish kunlari"
      description="Ish kunlari va dam olish kunlarini, ochilish/yopilish vaqtlarini belgilang."
    >
      <ScheduleEditor schedule={schedule} setSchedule={setSchedule} />
    </Section>
  );
}

/* ============================================================
   Services & languages — CreateSalonPage bilan bir xil tuzilma
   ============================================================ */

function JoinServicesStep(props: {
  services: ServiceRow[];
  addService: () => void;
  removeService: (id: string) => void;
  updateService: (id: string, k: keyof Omit<ServiceRow, "id">, v: string) => void;
  applyPreset: (p: { name: string; price: string; duration: string }) => void;
}) {
  const PRESETS: Array<{ name: string; price: string; duration: string }> = [
    { name: "Soch olish", price: "60000", duration: "30" },
    { name: "Soqol olish", price: "40000", duration: "20" },
    { name: "Bolalar uchun", price: "50000", duration: "25" },
    { name: "Soch + Soqol", price: "90000", duration: "45" },
    { name: "Soch yuvish", price: "20000", duration: "15" },
  ];

  return (
    <Section
      icon={<Scissors className="h-4 w-4" />}
      label="Xizmatlar"
      title="Sizning xizmatlaringiz"
      description="Tezda qo‘shish uchun pastdagi tayyor xizmatlardan tanlang."
    >
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Tezkor qo‘shish
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => {
            const already = props.services.some(
              (s) => s.name.trim().toLowerCase() === p.name.toLowerCase(),
            );
            return (
              <button
                key={p.name}
                type="button"
                disabled={already}
                onClick={() => props.applyPreset(p)}
                className={cn(
                  "group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium transition-[var(--transition-smooth)]",
                  already
                    ? "cursor-not-allowed opacity-40"
                    : "hover:border-foreground hover:bg-muted/60",
                )}
              >
                <Plus className="h-3 w-3 transition-transform group-hover:rotate-90" />
                {p.name}
                <span className="text-muted-foreground">· {p.duration}min</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {props.services.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="group relative rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)] transition-[var(--transition-smooth)] hover:border-foreground/40 sm:p-4">
                <div className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold tabular-nums text-background shadow-[var(--shadow-soft)]">
                  {i + 1}
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_110px_110px_auto] sm:items-center">
                  <FloatingInput
                    label="Xizmat nomi"
                    value={s.name}
                    onChange={(v) => props.updateService(s.id, "name", v)}
                    compact
                  />
                  <div className="grid grid-cols-2 gap-3 sm:contents">
                    <SomPriceInput
                      label="Narxi (so'm)"
                      value={s.price}
                      onChange={(digits) => props.updateService(s.id, "price", digits)}
                      compact
                    />
                    <FloatingInput
                      label="Vaqti (min)"
                      value={s.duration}
                      onChange={(v) => props.updateService(s.id, "duration", v.replace(/\D/g, ""))}
                      compact
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => props.removeService(s.id)}
                    disabled={props.services.length === 1}
                    className="hidden h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-[var(--transition-smooth)] hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 disabled:hover:border-border disabled:hover:bg-background disabled:hover:text-muted-foreground sm:flex"
                    aria-label="O'chirish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => props.removeService(s.id)}
                  disabled={props.services.length === 1}
                  className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-[11px] font-medium text-muted-foreground transition-[var(--transition-smooth)] hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 sm:hidden"
                >
                  <Trash2 className="h-3.5 w-3.5" /> O'chirish
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <button
          type="button"
          onClick={props.addService}
          className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-transparent px-4 py-3.5 text-sm font-semibold text-foreground transition-[var(--transition-smooth)] hover:border-foreground hover:bg-muted/60 active:scale-[0.99]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background transition-transform group-hover:rotate-90">
            <Plus className="h-4 w-4" />
          </span>
          Bo'sh xizmat qo'shish
        </button>
      </div>
    </Section>
  );
}

function JoinLanguagesStep(props: { languages: string[]; toggleLanguage: (code: string) => void }) {
  return (
    <Section
      icon={<Languages className="h-4 w-4" />}
      label="Tillar"
      title="Qaysi tillarda gaplashasiz?"
      description="Kamida bitta tilni tanlang."
    >
      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map((l) => {
          const active = props.languages.includes(l.code);
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => props.toggleLanguage(l.code)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-[var(--transition-smooth)]",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground hover:border-foreground/40",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border",
                  active ? "border-background bg-background text-foreground" : "border-border",
                )}
              >
                {active && <Check className="h-2.5 w-2.5" />}
              </span>
              {l.label}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/* ============================================================
   Step indicator
   ============================================================ */

function StepIndicator({
  step,
  stepValid,
  onJump,
}: {
  step: number;
  stepValid: boolean[];
  onJump: (i: number) => void;
}) {
  const total = STEP_META.length;
  const progress = ((step + 1) / total) * 100;

  const profilChip: "idle" | "active" | "done" = step <= 2 ? "active" : "done";
  const jadvalChip: "idle" | "active" | "done" = step < 3 ? "idle" : step === 3 ? "active" : "done";
  const tillarChip: "idle" | "active" | "done" = step < 4 ? "idle" : step === 4 ? "active" : "done";

  return (
    <div className="mx-auto max-w-[920px] px-3.5 pb-3.5 sm:px-6 sm:pb-5">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 sm:mb-4 sm:gap-3">
        <GroupChip icon={User} label="Profil" state={profilChip} />
        <GroupConnector filled={step >= 3} />
        <GroupChip icon={CalendarDays} label="Jadval" state={jadvalChip} />
        <GroupConnector filled={step >= 4} />
        <GroupChip icon={Languages} label="Tillar" state={tillarChip} />
      </div>

      <div className="mb-2.5 flex items-center gap-2.5 sm:mb-3 sm:gap-3">
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted sm:h-1.5">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-foreground"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-wider tabular-nums text-muted-foreground sm:text-[10px]">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="-mx-1 flex items-center justify-center gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STEP_META.map((meta, i) => {
          const Icon = meta.icon;
          const done = i < step;
          const active = i === step;
          const reachable = i <= step || stepValid.slice(0, i).every(Boolean);
          const isGroupStart = i > 0 && STEP_META[i - 1].group !== meta.group;
          return (
            <div key={i} className="flex shrink-0 items-center gap-1 sm:flex-1">
              {isGroupStart && <span className="mx-1 h-4 w-px shrink-0 bg-border" />}
              <button
                type="button"
                onClick={() => reachable && onJump(i)}
                disabled={!reachable}
                className={cn(
                  "group relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-[var(--transition-smooth)] sm:h-8 sm:w-8",
                  done
                    ? "border-foreground bg-foreground text-background"
                    : active
                      ? "border-foreground bg-background text-foreground shadow-[var(--shadow-soft)]"
                      : "border-border bg-background text-muted-foreground",
                  reachable && !active ? "cursor-pointer hover:border-foreground" : "",
                  !reachable && "cursor-not-allowed opacity-40",
                )}
                aria-label={`${meta.short} qadami`}
              >
                {done ? (
                  <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                ) : (
                  <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                )}
                {active && (
                  <motion.span
                    layoutId="active-ring-setup"
                    className="absolute -inset-1 rounded-full ring-2 ring-foreground/25"
                    transition={{ duration: 0.3 }}
                  />
                )}
              </button>
              {i < STEP_META.length - 1 && !isGroupStart && (
                <div
                  className={cn(
                    "hidden h-[2px] w-6 rounded-full transition-[var(--transition-smooth)] sm:block sm:w-auto sm:flex-1",
                    i < step ? "bg-foreground" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GroupChip({
  icon: Icon,
  label,
  state,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  state: "idle" | "active" | "done";
}) {
  return (
    <motion.div
      initial={false}
      animate={{
        scale: state === "active" ? 1.03 : 1,
      }}
      transition={{ duration: 0.3 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 transition-[var(--transition-smooth)] sm:gap-2 sm:px-2.5 sm:py-1.5",
        state === "active" &&
          "border-foreground bg-foreground text-background shadow-[var(--shadow-pop)]",
        state === "done" && "border-foreground/40 bg-card text-foreground",
        state === "idle" && "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full sm:h-6 sm:w-6",
          state === "active" && "bg-background text-foreground",
          state === "done" && "bg-foreground text-background",
          state === "idle" && "bg-background text-muted-foreground",
        )}
      >
        {state === "done" ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
      </span>
      <span className="text-[11px] font-semibold tracking-wide sm:text-xs">{label}</span>
    </motion.div>
  );
}

function GroupConnector({ filled }: { filled: boolean }) {
  return (
    <div className="relative h-[2px] w-8 overflow-hidden rounded-full bg-border sm:w-14">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-foreground"
        initial={false}
        animate={{ width: filled ? "100%" : "0%" }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  );
}

/* ============================================================
   Section
   ============================================================ */

function Section({
  icon,
  label,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border bg-card p-3.5 shadow-[var(--shadow-card)] sm:p-7"
    >
      <div className="mb-4 flex items-start gap-3 sm:mb-5 sm:gap-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background sm:h-10 sm:w-10">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px] sm:tracking-[0.18em]">
            {label}
          </div>
          <h2 className="text-[15px] font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
            {title}
          </h2>
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground sm:text-sm">
            {description}
          </p>
        </div>
      </div>
      <div className="space-y-3.5 sm:space-y-4">{children}</div>
    </motion.section>
  );
}

/* ============================================================
   Inputs (FloatingInput, FloatingTextarea, PhoneInput)
   — copied from CreateSalonPage to keep look 1:1
   ============================================================ */

function FloatingInput({
  label,
  value,
  onChange,
  required,
  compact,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  compact?: boolean;
}) {
  const has = value.length > 0;
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "peer w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-[var(--transition-smooth)] placeholder-transparent focus:border-foreground",
          compact ? "h-12 pb-1 pt-4" : "h-14 pb-1.5 pt-5",
        )}
        placeholder={label}
      />
      <label
        className={cn(
          "pointer-events-none absolute left-3.5 text-muted-foreground transition-[var(--transition-smooth)]",
          has || compact
            ? compact
              ? "top-1.5 text-[10px] uppercase tracking-wider"
              : "top-2 text-[10px] uppercase tracking-wider"
            : "top-1/2 -translate-y-1/2 text-sm",
          "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-foreground",
          compact && "peer-focus:top-1.5",
        )}
      >
        {label}
        {required && <span className="ml-0.5 text-foreground">*</span>}
      </label>
    </div>
  );
}

function FloatingTextarea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const has = value.length > 0;
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="peer w-full resize-none rounded-xl border border-border bg-background px-3.5 pb-3 pt-6 text-sm text-foreground outline-none transition-[var(--transition-smooth)] focus:border-foreground"
        placeholder={placeholder ?? " "}
      />
      <label
        className={cn(
          "pointer-events-none absolute left-3.5 transition-[var(--transition-smooth)]",
          has
            ? "top-2 text-[10px] uppercase tracking-wider text-muted-foreground"
            : "top-4 text-sm text-muted-foreground",
          "peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-foreground",
        )}
      >
        {label}
      </label>
    </div>
  );
}

function PhoneInput({
  label,
  digits,
  onChange,
  required,
}: {
  label: string;
  digits: string;
  onChange: (digitsOnly: string) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formatted = formatPhone(digits);
  const has = digits.length > 0;
  const valid = digits.length === 9;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const len = el.value.length;
    if (document.activeElement === el) {
      el.setSelectionRange(len, len);
    }
  }, [formatted]);

  return (
    <div className="relative">
      <div
        className={cn(
          "flex h-14 w-full items-stretch rounded-xl border border-border bg-background transition-[var(--transition-smooth)] focus-within:border-foreground",
          has && !valid && "border-destructive/60 focus-within:border-destructive",
        )}
      >
        <div className="flex items-center gap-1.5 border-r border-border px-3.5">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold tabular-nums text-foreground">+998</span>
        </div>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            inputMode="numeric"
            autoComplete="tel-national"
            value={formatted}
            onChange={(e) => onChange(normalizePhoneDigits(e.target.value))}
            placeholder="99 123-45-67"
            className={cn(
              "peer h-full w-full rounded-r-xl bg-transparent px-3.5 text-sm tabular-nums text-foreground outline-none placeholder:text-muted-foreground/60",
              has ? "pb-1.5 pt-5" : "",
            )}
          />
          <label
            className={cn(
              "pointer-events-none absolute left-3.5 text-muted-foreground transition-[var(--transition-smooth)]",
              has
                ? "top-2 text-[10px] uppercase tracking-wider"
                : "top-1/2 -translate-y-1/2 text-sm",
              "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-foreground",
            )}
          >
            {label}
            {required && <span className="ml-0.5 text-foreground">*</span>}
          </label>
        </div>
        {valid && (
          <div className="flex items-center pr-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
              <Check className="h-3 w-3" />
            </span>
          </div>
        )}
      </div>
      {has && !valid && (
        <p className="mt-1.5 text-[11px] font-medium text-destructive">
          Telefon raqami 9 ta raqamdan iborat bo‘lishi kerak
        </p>
      )}
    </div>
  );
}

/* ============================================================
   ScheduleEditor — premium per-day editor (mirrors CreateSalonPage)
   ============================================================ */

function ScheduleEditor({
  schedule,
  setSchedule,
}: {
  schedule: DaySchedule[];
  setSchedule: React.Dispatch<React.SetStateAction<DaySchedule[]>>;
}) {
  const update = (day: string, patch: Partial<DaySchedule>) =>
    setSchedule((prev) => prev.map((d) => (d.day === day ? { ...d, ...patch } : d)));

  const applyAll = (patch: Partial<DaySchedule>) =>
    setSchedule((prev) => prev.map((d) => ({ ...d, ...patch })));

  const openCount = schedule.filter((d) => d.open).length;

  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const firstOpen = schedule.find((d) => d.open);
    return firstOpen?.day ?? schedule[0].day;
  });
  const selected = schedule.find((d) => d.day === selectedDay) ?? schedule[0];

  const PRESETS = [
    {
      key: "weekdays",
      label: "Du – Ju",
      sub: "9:00 – 20:00",
      apply: () =>
        setSchedule((prev) =>
          prev.map((d) => ({
            ...d,
            open: !["Sat", "Sun"].includes(d.day),
            from: "09:00",
            to: "20:00",
          })),
        ),
    },
    {
      key: "everyday",
      label: "Har kuni",
      sub: "10:00 – 22:00",
      apply: () => applyAll({ open: true, from: "10:00", to: "22:00" }),
    },
    {
      key: "longweek",
      label: "Du – Sha",
      sub: "10:00 – 21:00",
      apply: () =>
        setSchedule((prev) =>
          prev.map((d) => ({
            ...d,
            open: !["Sun"].includes(d.day),
            from: "10:00",
            to: "21:00",
          })),
        ),
    },
  ];

  const HOURS = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between gap-2.5"
      >
        <div>
          <div className="flex items-baseline gap-1.5">
            <motion.span
              key={openCount}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="onboarding-section-title text-foreground tabular-nums"
            >
              {openCount}
            </motion.span>
            <span className="text-[13px] font-semibold text-muted-foreground sm:text-sm">
              / 7 kun
            </span>
          </div>
          <div className="text-[10.5px] text-muted-foreground sm:text-[11px]">
            {openCount === 0
              ? "Ish kuni tanlanmagan"
              : openCount === 7
                ? "Dam olish kunisiz"
                : `${7 - openCount} kun dam olasiz`}
          </div>
        </div>
        {openCount > 0 && (
          <button
            onClick={() => applyAll({ open: false })}
            className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Tozalash
          </button>
        )}
      </motion.div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {PRESETS.map((p) => (
          <motion.button
            key={p.key}
            whileTap={{ scale: 0.96 }}
            onClick={p.apply}
            className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-left transition-colors hover:border-foreground hover:bg-muted/40 sm:gap-2 sm:px-3.5 sm:py-2"
          >
            <span className="text-[11px] font-bold leading-none text-foreground sm:text-[12px]">
              {p.label}
            </span>
            <span className="text-[9.5px] font-medium leading-none text-muted-foreground tabular-nums sm:text-[10px]">
              {p.sub}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Day selector */}
      <div className="relative">
        <div className="-mx-1 grid grid-cols-7 gap-1 px-1 sm:gap-1.5">
          {schedule.map((d) => {
            const isSelected = d.day === selectedDay;
            const dayShort = WEEKDAY_LABELS[d.day]?.slice(0, 2) ?? d.day;
            return (
              <motion.button
                key={d.day}
                whileTap={{ scale: 0.94 }}
                onClick={() => setSelectedDay(d.day)}
                className="group relative flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2 transition-colors"
              >
                {isSelected && (
                  <motion.span
                    layoutId="day-pill-bg-setup"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-2xl bg-muted/60"
                  />
                )}
                <span
                  className={cn(
                    "relative text-[11px] font-bold uppercase tracking-wider transition-colors",
                    isSelected
                      ? "text-foreground"
                      : d.open
                        ? "text-foreground/70"
                        : "text-muted-foreground/60",
                  )}
                >
                  {dayShort}
                </span>
                <span
                  className={cn(
                    "relative inline-flex h-1.5 w-1.5 rounded-full transition-colors",
                    d.open ? "bg-foreground" : "bg-muted-foreground/30",
                  )}
                />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Selected day editor */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selected.day}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tanlangan kun
              </div>
              <div className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                {WEEKDAY_LABELS[selected.day]}
              </div>
            </div>

            <button
              type="button"
              onClick={() => update(selected.day, { open: !selected.open })}
              className={cn(
                "relative inline-flex h-9 items-center rounded-full p-1 transition-colors",
                selected.open ? "bg-foreground" : "bg-muted",
              )}
              style={{ width: 92 }}
            >
              <span
                className={cn(
                  "absolute inset-y-0 flex items-center px-3 text-[10px] font-bold uppercase tracking-wider transition-opacity",
                  selected.open ? "right-3 text-background opacity-100" : "right-3 opacity-0",
                )}
              >
                Ochiq
              </span>
              <span
                className={cn(
                  "absolute inset-y-0 flex items-center px-3 text-[10px] font-bold uppercase tracking-wider transition-opacity",
                  !selected.open ? "left-3 text-muted-foreground opacity-100" : "left-3 opacity-0",
                )}
              >
                Yopiq
              </span>
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className={cn(
                  "relative h-7 w-7 rounded-full bg-background shadow-[var(--shadow-soft)]",
                  selected.open ? "ml-[58px]" : "ml-0",
                )}
              />
            </button>
          </div>

          <AnimatePresence initial={false} mode="wait">
            {selected.open ? (
              <motion.div
                key="open-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="border-t border-border/60 px-4 py-4 sm:px-5 sm:py-5">
                  <div className="mb-4 flex items-stretch justify-center gap-2 sm:gap-5">
                    <TimePicker
                      label="Ochilish"
                      value={selected.from}
                      onChange={(v) => update(selected.day, { from: v })}
                    />
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center text-xl font-light text-muted-foreground sm:text-2xl"
                    >
                      —
                    </motion.div>
                    <TimePicker
                      label="Yopilish"
                      value={selected.to}
                      onChange={(v) => update(selected.day, { to: v })}
                    />
                  </div>

                  <div className="mb-4 px-1">
                    <div className="relative h-9 rounded-xl bg-muted/40">
                      <div className="absolute inset-x-0 inset-y-0 flex justify-between px-1">
                        {HOURS.map((h) => (
                          <div key={h} className="flex flex-col items-center justify-center">
                            <span
                              className={cn(
                                "h-1 w-px",
                                h % 6 === 0 ? "bg-muted-foreground/50" : "bg-muted-foreground/20",
                              )}
                            />
                          </div>
                        ))}
                      </div>
                      <motion.div
                        layout
                        transition={{ type: "spring", stiffness: 240, damping: 28 }}
                        className="absolute inset-y-1 rounded-lg bg-foreground"
                        style={{
                          left: `${(toMinutes(selected.from) / (24 * 60)) * 100}%`,
                          width: `${Math.max(2, ((toMinutes(selected.to) - toMinutes(selected.from)) / (24 * 60)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between px-0.5 text-[9px] font-medium text-muted-foreground tabular-nums">
                      <span>0</span>
                      <span>6</span>
                      <span>12</span>
                      <span>18</span>
                      <span>24</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Ochilish vaqti
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {["08:00", "09:00", "10:00", "11:00", "12:00"].map((t) => {
                          const active = selected.from === t;
                          return (
                            <motion.button
                              key={`from-${t}`}
                              whileTap={{ scale: 0.93 }}
                              onClick={() => update(selected.day, { from: t })}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-[11px] font-bold tabular-nums transition-colors",
                                active
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border bg-background text-foreground hover:border-foreground/50",
                              )}
                            >
                              {t}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Yopilish vaqti
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"].map((t) => {
                          const active = selected.to === t;
                          return (
                            <motion.button
                              key={`to-${t}`}
                              whileTap={{ scale: 0.93 }}
                              onClick={() => update(selected.day, { to: t })}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-[11px] font-bold tabular-nums transition-colors",
                                active
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border bg-background text-foreground hover:border-foreground/50",
                              )}
                            >
                              {t}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setSchedule((prev) =>
                        prev.map((x) =>
                          x.open ? { ...x, from: selected.from, to: selected.to } : x,
                        ),
                      )
                    }
                    className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-xl border border-dashed border-border bg-transparent px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-foreground hover:bg-muted/30 hover:text-foreground"
                  >
                    Bu vaqtni barcha ish kunlariga qo‘llash
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="closed-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border/60 px-5 py-8 text-center">
                  <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
                  <p className="text-sm font-semibold text-foreground">Dam olish kuni</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Yuqoridagi tugmani bosib ochsangiz bo‘ladi
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      onClick={() => {
        const el = ref.current;
        if (!el) return;
        if (
          typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === "function"
        ) {
          (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
        } else {
          el.focus();
        }
      }}
      className="group relative flex flex-1 flex-col items-center rounded-2xl border border-border bg-background px-2 py-2.5 transition-colors hover:border-foreground sm:px-4 sm:py-4"
    >
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-[28px]"
      >
        {value}
      </motion.span>
      <input
        ref={ref}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </button>
  );
}

/* ============================================================
   Success overlay
   ============================================================ */

function SuccessOverlay({
  barberName,
  onContinue,
}: {
  barberName: string;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-background/95 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-2xl sm:px-5 sm:py-6"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, color-mix(in oklab, var(--foreground) 5%, transparent) 0%, transparent 60%)",
        }}
      />

      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 4 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="relative my-auto w-full max-w-[420px] px-1 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-6 flex flex-col items-center"
        >
          <motion.svg
            viewBox="0 0 80 80"
            className="mb-3 h-14 w-14 sm:mb-4 sm:h-20 sm:w-20"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
          >
            <motion.circle
              cx="40"
              cy="40"
              r="36"
              className="text-muted/60"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
            <motion.path
              d="M26 41 L36 51 L55 30"
              className="text-foreground"
              strokeWidth={3}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.55, ease: "easeOut" }}
            />
          </motion.svg>

          <motion.span
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 1, letterSpacing: "0.18em" }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            Yakunlandi
          </motion.span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          className="onboarding-section-title text-foreground"
        >
          Hammasi tayyor
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.4 }}
          className="mx-auto mt-2.5 max-w-[300px] px-2 text-[12.5px] leading-relaxed text-muted-foreground sm:mt-3 sm:px-0 sm:text-sm"
        >
          Profilingiz va ish jadvalingiz saqlandi. Endi mijozlar sizni topa oladi.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.4 }}
          className="mx-auto mt-6 flex max-w-[340px] items-stretch justify-center divide-x divide-border sm:mt-7"
        >
          <div className="flex-1 px-3">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Barber
            </div>
            <div className="mt-0.5 truncate text-sm font-bold text-foreground">
              {barberName || "—"}
            </div>
          </div>
          <div className="flex-1 px-3">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Holat
            </div>
            <div className="mt-0.5 truncate text-sm font-bold text-foreground">Faol</div>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.4 }}
          onClick={onContinue}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-semibold text-background transition-colors hover:opacity-90 sm:mt-8"
        >
          Barber panelga o‘tish
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
