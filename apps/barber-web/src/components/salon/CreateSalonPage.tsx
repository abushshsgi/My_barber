"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Scissors,
  Check,
  Loader2,
  UploadCloud,
  X,
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  Languages,
  CalendarDays,
  Sparkles,
  Store,
  ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch, formatApiError } from "@/lib/api";

/* ============================================================
   Types
   ============================================================ */

type Service = {
  id: string;
  name: string;
  price: string;
  duration: string;
};

type DaySchedule = {
  day: string;
  open: boolean;
  from: string;
  to: string;
};

type CreateSalonPageProps = {
  preset?: string;
  initialSalonName?: string;
  lockSalonName?: boolean;
  initialPhone?: string;
  initialAddress?: string;
  initialLat?: string;
  initialLng?: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_LABELS: Record<string, string> = {
  Mon: "Dushanba",
  Tue: "Seshanba",
  Wed: "Chorshanba",
  Thu: "Payshanba",
  Fri: "Juma",
  Sat: "Shanba",
  Sun: "Yakshanba",
};

const LANGUAGES = [
  { code: "uz", label: "O'zbek" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
];

/* ============================================================
   Step metadata
   ============================================================ */

const STEP_META = [
  {
    group: "Salon",
    short: "Asosiy",
    title: "Salon haqida ma'lumot",
    subtitle: "Salon nomi va aloqa raqami — mijozlar sizni shu nom bilan topadi.",
    icon: Store,
  },
  {
    group: "Salon",
    short: "Lokatsiya",
    title: "Salon manzili",
    subtitle: "Mijozlar sizning saloningizga oson topib kelishi uchun manzil.",
    icon: MapPin,
  },
  {
    group: "Salon",
    short: "Cover",
    title: "Salon rasmi",
    subtitle: "Bosh sahifada ko'rinadigan chiroyli cover rasm yuklang.",
    icon: ImageIcon,
  },
  {
    group: "Barber",
    short: "Profil",
    title: "Barber profili",
    subtitle: "Endi o'zingiz haqingizda — ism, familiya, telefon va rasm.",
    icon: User,
  },
  {
    group: "Barber",
    short: "Xizmatlar",
    title: "Sizning xizmatlaringiz",
    subtitle: "Mijozlar buyurtma berishi mumkin bo'lgan xizmatlar ro'yxati.",
    icon: Scissors,
  },
  {
    group: "Barber",
    short: "Jadval",
    title: "Ish jadvali",
    subtitle: "Qaysi kunlari ishlaysiz va dam olasiz — vaqtlarni belgilang.",
    icon: CalendarDays,
  },
  {
    group: "Barber",
    short: "Tillar",
    title: "Muloqot tillari",
    subtitle: "Mijozlar bilan qaysi tillarda gaplasha olasiz?",
    icon: Languages,
  },
] as const;

const TOTAL_STEPS = STEP_META.length;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ============================================================
   Phone helpers — +998 fixed prefix, format: 99 123-45-67
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

function fullPhoneFromDigits(digits: string): string {
  const d = normalizePhoneDigits(digits);
  return d ? `+998${d}` : "";
}

function parseDurationMinutes(s: string): number {
  const n = Number((s || "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.round(n);
}

function parsePrice(s: string): number {
  const n = Number((s || "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

function locationTextFromParts(city: string, address: string, landmark: string) {
  const c = (city || "").trim();
  const a = (address || "").trim();
  const l = (landmark || "").trim();
  const base = [c, a].filter(Boolean).join(", ");
  return l ? `${base} (${l})` : base;
}

function fallbackLatLng() {
  // Default to Tashkent center if user denies geolocation. (Avoids onboarding being stuck.)
  return { lat: 41.311081, lng: 69.240562 };
}

function round6(n: number): number {
  return Number(n.toFixed(6));
}

async function geocodeAddress(q: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { cache: "no-store" });
  if (!res.ok) return null;
  const j = (await res.json().catch(() => null)) as { ok?: boolean; lat?: number; lng?: number } | null;
  if (!j?.ok) return null;
  if (!Number.isFinite(j.lat) || !Number.isFinite(j.lng)) return null;
  return { lat: round6(Number(j.lat)), lng: round6(Number(j.lng)) };
}

/* ============================================================
   Page (UI is 1:1 with upstream; only submit is wired)
   ============================================================ */

export function CreateSalonPage(props: CreateSalonPageProps) {
  const router = useRouter();

  // --- Salon state ---
  const [salonName, setSalonName] = useState(props.initialSalonName || "");
  const [salonDescription, setSalonDescription] = useState("");
  const [salonPhoneDigits, setSalonPhoneDigits] = useState(
    normalizePhoneDigits(props.initialPhone || ""),
  );
  const [salonAddress, setSalonAddress] = useState(props.initialAddress || "");
  const [salonCity, setSalonCity] = useState("");
  const [salonLandmark, setSalonLandmark] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [coverDrag, setCoverDrag] = useState(false);

  // Backing files for uploads (UI uses preview URLs)
  const coverFileRef = useRef<File | null>(null);
  const avatarFileRef = useRef<File | null>(null);

  // Geo used for BarberProfile lat/lng (needed for backend onboarding completeness)
  const geoRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastGeocodeQueryRef = useRef<string>("");
  const geocodeTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) {
      geoRef.current = fallbackLatLng();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geoRef.current = { lat: round6(pos.coords.latitude), lng: round6(pos.coords.longitude) };
      },
      () => {
        geoRef.current = fallbackLatLng();
      },
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 8000 },
    );
  }, []);

  // Address → lat/lng (geocode). Keeps UI 1:1 (no new fields).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = locationTextFromParts(salonCity, salonAddress, salonLandmark);
    const normalized = q.trim();
    if (normalized.length < 6) return;
    if (normalized === lastGeocodeQueryRef.current) return;

    if (geocodeTimerRef.current) {
      window.clearTimeout(geocodeTimerRef.current);
    }
    geocodeTimerRef.current = window.setTimeout(() => {
      lastGeocodeQueryRef.current = normalized;
      void (async () => {
        const hit = await geocodeAddress(normalized);
        if (hit) geoRef.current = hit;
      })();
    }, 650);

    return () => {
      if (geocodeTimerRef.current) window.clearTimeout(geocodeTimerRef.current);
      geocodeTimerRef.current = null;
    };
  }, [salonCity, salonAddress, salonLandmark]);

  // --- Barber (owner) profile state ---
  const [barberFirstName, setBarberFirstName] = useState("");
  const [barberLastName, setBarberLastName] = useState("");
  const [barberPhoneDigits, setBarberPhoneDigits] = useState("");
  const [barberAvatar, setBarberAvatar] = useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([
    { id: uid(), name: "", price: "", duration: "" },
  ]);

  const [schedule, setSchedule] = useState<DaySchedule[]>(
    WEEKDAYS.map((d, i) => ({
      day: d,
      open: i < 6,
      from: "09:00",
      to: "20:00",
    })),
  );

  const [languages, setLanguages] = useState<string[]>(["uz"]);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // --- Multi-step wizard ---
  // 0..2 = Salon group (Info, Location, Cover)
  // 3..6 = Barber group (Profile, Services, Schedule, Languages)
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const stepValid = useMemo(() => {
    return [
      // 0: Salon Info
      salonName.trim().length > 1 && salonPhoneDigits.length === 9,
      // 1: Location
      salonCity.trim().length > 1 && salonAddress.trim().length > 2,
      // 2: Cover (optional)
      true,
      // 3: Barber profile
      barberFirstName.trim().length > 1 &&
        barberLastName.trim().length > 1 &&
        barberPhoneDigits.length === 9,
      // 4: Services
      services.every((s) => s.name && s.price && s.duration),
      // 5: Schedule
      schedule.some((d) => d.open),
      // 6: Languages
      languages.length > 0,
    ];
  }, [
    salonName,
    salonPhoneDigits,
    salonCity,
    salonAddress,
    barberFirstName,
    barberLastName,
    barberPhoneDigits,
    services,
    schedule,
    languages,
  ]);

  const isLast = step === TOTAL_STEPS - 1;
  const canNext = stepValid[step];
  const allValid = stepValid.every(Boolean);

  const goNext = () => {
    if (!canNext || isLast) return;
    setDirection(1);
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    if (step === 0) return;
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const updateService = (id: string, key: keyof Service, value: string) =>
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: value } : s)));

  const addService = () =>
    setServices((prev) => [...prev, { id: uid(), name: "", price: "", duration: "" }]);

  const removeService = (id: string) =>
    setServices((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));

  const toggleLanguage = (code: string) =>
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );

  const handleCoverFile = (files: FileList | null) => {
    if (!files || !files[0]) return;
    if (!files[0].type.startsWith("image/")) return;
    coverFileRef.current = files[0];
    setCover(URL.createObjectURL(files[0]));
  };

  const handleAvatarFile = (files: FileList | null) => {
    if (!files || !files[0]) return;
    if (!files[0].type.startsWith("image/")) return;
    avatarFileRef.current = files[0];
    setBarberAvatar(URL.createObjectURL(files[0]));
  };

  const handleSubmit = async () => {
    if (!allValid || submitting) return;
    setSubmitting(true);
    try {
      const locText = locationTextFromParts(salonCity, salonAddress, salonLandmark);
      const geo = geoRef.current ?? fallbackLatLng();

      // 1) Update barber identity fields (best effort; may be optional on backend)
      {
        const full_name = `${barberFirstName} ${barberLastName}`.trim();
        const phone = fullPhoneFromDigits(barberPhoneDigits);
        const body =
          avatarFileRef.current
            ? (() => {
                const fd = new FormData();
                fd.append("full_name", full_name);
                fd.append("phone", phone);
                fd.append("avatar", avatarFileRef.current);
                return fd;
              })()
            : JSON.stringify({ full_name, phone });
        const res = await apiFetch("/api/v1/barber/auth/me/", { method: "PATCH", body });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(formatApiError(body, "Barber profili saqlanmadi"));
        }
      }

      // 2) Update barber profile location (required for onboarding completeness)
      {
        const res = await apiFetch("/api/v1/barber/profile/", {
          method: "PATCH",
          body: JSON.stringify({
            location_text: locText,
            latitude: round6(geo.lat),
            longitude: round6(geo.lng),
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(formatApiError(body, "Location saqlanmadi"));
        }
      }

      // 3) Create salon (owner)
      let salonId: number | null = null;
      {
        const payload = {
          name: salonName.trim(),
          description: salonDescription.trim(),
          address: locText,
          phone: fullPhoneFromDigits(salonPhoneDigits),
          languages,
          services: services.map((s) => ({
            name: (s.name || "").trim(),
            price: parsePrice(s.price),
            duration_minutes: parseDurationMinutes(s.duration),
          })),
        };
        const res = await apiFetch("/api/v1/salons/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(formatApiError(body, "Salon yaratilmadi"));
        }
        salonId = typeof body?.id === "number" ? body.id : null;
      }

      // 4) Upload cover (optional)
      if (salonId && coverFileRef.current) {
        const fd = new FormData();
        fd.append("cover", coverFileRef.current);
        const res = await apiFetch(`/api/v1/salons/${salonId}/upload_cover/`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(formatApiError(body, "Cover upload bo'lmadi"));
        }
      }

      // 5) Ensure membership working hours exist (required for onboarding completeness)
      {
        // Find owner or active membership
        const memRes = await apiFetch("/api/v1/memberships/");
        if (!memRes.ok) {
          const body = await memRes.json().catch(() => ({}));
          throw new Error(formatApiError(body, "Membership topilmadi"));
        }
        const j = (await memRes.json()) as { results?: any[] } | any[];
        const mems = Array.isArray(j) ? j : j.results || [];
        const owner = mems.find((m) => m.role === "owner");
        const active = mems.find((m) => m.invite_state === "active");
        const membership = owner || active;
        if (!membership?.id) {
          throw new Error("Salon membership topilmadi. Avval salonga uling yoki salon yarating.");
        }

        // Fetch existing schedules for membership (so we can PATCH by id)
        const schRes = await apiFetch(
          `/api/v1/schedules/?membership=${encodeURIComponent(String(membership.id))}`,
        );
        const existingRows: Array<{ id: number; weekday: number }> = [];
        if (schRes.ok) {
          const sj = (await schRes.json().catch(() => ({}))) as { results?: any[] } | any[];
          const rows = Array.isArray(sj) ? sj : sj.results || [];
          for (const r of rows) {
            if (typeof r?.id === "number" && typeof r?.weekday === "number") {
              existingRows.push({ id: r.id, weekday: r.weekday });
            }
          }
        }

        const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
        const weekdayIdx = (day: string): number => {
          const i = DAYS.indexOf(day as any);
          return i >= 0 ? i : 0;
        };

        for (const d of schedule) {
          const weekday = weekdayIdx(d.day);
          const existing = existingRows.find((x) => x.weekday === weekday);
          const payload = {
            membership: membership.id,
            weekday,
            open_time: d.from,
            close_time: d.to,
            is_day_off: !d.open,
          };
          const path = existing ? `/api/v1/schedules/${existing.id}/` : "/api/v1/schedules/";
          const method = existing ? "PATCH" : "POST";
          const res = await apiFetch(path, {
            method,
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(formatApiError(body, `Schedule saqlanmadi (${d.day})`));
          }
        }
      }

      setSuccess(true);
      // After success overlay closes, go to dashboard.
      // (Overlay button calls onClose, we also route here for safety.)
      router.replace("/");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Xatolik yuz berdi";
      if (typeof window !== "undefined") window.alert(msg);
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const currentMeta = STEP_META[step];

  return (
    <div className="min-h-screen bg-background pb-28 sm:pb-32">
      {/* Success overlay */}
      <AnimatePresence>
        {success && (
          <SuccessOverlay
            salonName={salonName}
            barberName={`${barberFirstName} ${barberLastName}`.trim()}
            onClose={() => {
              setSuccess(false);
              router.replace("/");
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[920px] items-center justify-between px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <Scissors className="h-4 w-4 text-background" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Barber Studio</span>
          </div>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            <span className="text-foreground">{step + 1}</span>
            <span className="opacity-50"> / {TOTAL_STEPS}</span>
          </span>
        </div>
        <StepIndicator
          step={step}
          stepValid={stepValid}
          onJump={(i) => {
            // Allow jumping back freely; jumping forward only if all preceding steps are valid
            if (i === step) return;
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

      <main className="mx-auto max-w-[920px] px-4 pt-8 sm:px-6 sm:pt-14">
        {/* Animated hero — changes per step */}
        <div className="mb-7 overflow-hidden text-center sm:mb-10">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`hero-${step}`}
              custom={direction}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
                  <currentMeta.icon className="h-2.5 w-2.5" />
                </span>
                {currentMeta.group} · Qadam {step + 1}
              </div>
              <h1 className="text-[26px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
                {currentMeta.title}
              </h1>
              <p className="mx-auto mt-2.5 max-w-[520px] px-2 text-[13px] leading-snug text-muted-foreground sm:mt-3 sm:px-0 sm:text-base">
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
            className="space-y-5 sm:space-y-6"
          >
            {step === 0 && (
              <SalonInfoStep
                salonName={salonName}
                setSalonName={setSalonName}
                salonDescription={salonDescription}
                setSalonDescription={setSalonDescription}
                salonPhoneDigits={salonPhoneDigits}
                setSalonPhoneDigits={setSalonPhoneDigits}
              />
            )}
            {step === 1 && (
              <SalonLocationStep
                salonCity={salonCity}
                setSalonCity={setSalonCity}
                salonLandmark={salonLandmark}
                setSalonLandmark={setSalonLandmark}
                salonAddress={salonAddress}
                setSalonAddress={setSalonAddress}
              />
            )}
            {step === 2 && (
              <SalonCoverStep
                cover={cover}
                setCover={setCover}
                coverDrag={coverDrag}
                setCoverDrag={setCoverDrag}
                handleCoverFile={handleCoverFile}
              />
            )}
            {step === 3 && (
              <BarberProfileStep
                firstName={barberFirstName}
                setFirstName={setBarberFirstName}
                lastName={barberLastName}
                setLastName={setBarberLastName}
                phoneDigits={barberPhoneDigits}
                setPhoneDigits={setBarberPhoneDigits}
                avatar={barberAvatar}
                handleAvatarFile={handleAvatarFile}
              />
            )}
            {step === 4 && (
              <BarberServicesStep
                services={services}
                addService={addService}
                removeService={removeService}
                updateService={updateService}
              />
            )}
            {step === 5 && (
              <BarberScheduleStep schedule={schedule} setSchedule={setSchedule} />
            )}
            {step === 6 && (
              <BarberLanguagesStep languages={languages} toggleLanguage={toggleLanguage} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[920px] items-center justify-between gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-3 sm:px-6 sm:py-4">
          <button
            onClick={goBack}
            disabled={step === 0 || submitting}
            className={cn(
              "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-[var(--transition-smooth)] sm:h-11 sm:px-4",
              step === 0 ? "cursor-not-allowed opacity-40" : "hover:bg-muted active:scale-[0.98]",
            )}
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

          {!isLast ? (
            <button
              onClick={goNext}
              disabled={!canNext}
              className={cn(
                "group inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-[var(--transition-smooth)] sm:h-11 sm:flex-none sm:min-w-[170px]",
                canNext
                  ? "bg-foreground text-background hover:scale-[1.02] active:scale-[0.98]"
                  : "cursor-not-allowed bg-muted text-muted-foreground",
              )}
            >
              Keyingisi
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
            <button
              disabled={!allValid || submitting}
              onClick={handleSubmit}
              className={cn(
                "inline-flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl px-5 text-sm font-semibold transition-[var(--transition-smooth)] sm:h-11 sm:flex-none sm:min-w-[170px]",
                allValid && !submitting
                  ? "bg-foreground text-background hover:scale-[1.02] active:scale-[0.98]"
                  : "cursor-not-allowed bg-muted text-muted-foreground",
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Yaratilmoqda…
                </>
              ) : success ? (
                <>
                  <Check className="h-4 w-4" /> Yaratildi
                </>
              ) : (
                <>Yaratish</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Sub-step 0 — Salon Info
   ============================================================ */

function SalonInfoStep(props: {
  salonName: string;
  setSalonName: (v: string) => void;
  salonDescription: string;
  setSalonDescription: (v: string) => void;
  salonPhoneDigits: string;
  setSalonPhoneDigits: (v: string) => void;
}) {
  return (
    <Section
      icon={<Store className="h-4 w-4" />}
      label="Salon"
      title="Asosiy ma'lumotlar"
      description="Salon nomi va aloqa raqami."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FloatingInput
          label="Salon nomi"
          required
          value={props.salonName}
          onChange={props.setSalonName}
        />
        <PhoneInput
          label="Telefon raqami"
          required
          digits={props.salonPhoneDigits}
          onChange={props.setSalonPhoneDigits}
        />
      </div>
      <FloatingTextarea
        label="Salon haqida qisqacha (ixtiyoriy)"
        value={props.salonDescription}
        onChange={props.setSalonDescription}
      />
    </Section>
  );
}

/* ============================================================
   Sub-step 1 — Salon Location
   ============================================================ */

function SalonLocationStep(props: {
  salonCity: string;
  setSalonCity: (v: string) => void;
  salonLandmark: string;
  setSalonLandmark: (v: string) => void;
  salonAddress: string;
  setSalonAddress: (v: string) => void;
}) {
  return (
    <Section
      icon={<MapPin className="h-4 w-4" />}
      label="Lokatsiya"
      title="Salon manzili"
      description="Mijozlar sizni topa olishi uchun aniq manzil."
    >
      {/* Map preview on top — large, visual, premium */}
      <div className="relative h-52 overflow-hidden rounded-2xl border border-border bg-muted/30 sm:h-60">
        {/* grid */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* roads */}
        <div className="absolute left-0 right-0 top-1/3 h-[3px] bg-foreground/10" />
        <div className="absolute bottom-1/4 left-0 right-0 h-[3px] bg-foreground/10" />
        <div className="absolute bottom-0 left-1/3 top-0 w-[3px] bg-foreground/10" />
        <div className="absolute bottom-0 right-1/4 top-0 w-[3px] bg-foreground/10" />

        {/* radial fade */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at center, transparent 30%, var(--background) 100%)",
          }}
        />

        {/* pin */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2.5">
            <div className="relative">
              <div className="absolute -inset-3 animate-ping rounded-full bg-foreground/10" />
              <div className="absolute -inset-1 rounded-full bg-foreground/20 blur-md" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-[var(--shadow-pop)]">
                <MapPin className="h-5 w-5" />
              </div>
            </div>
            <div className="flex max-w-[280px] flex-col items-center gap-0.5 rounded-full border border-border bg-background/95 px-3 py-1 shadow-[var(--shadow-soft)] backdrop-blur">
              <span className="truncate text-[11px] font-semibold text-foreground">
                {props.salonCity.trim() || "Shahar tanlang"}
              </span>
              <span className="max-w-[260px] truncate text-[10px] text-muted-foreground">
                {props.salonAddress.trim() || "Ko'cha va uy raqami"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* City quick-pick chips */}
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Mashhur shaharlar
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Toshkent", "Samarqand", "Buxoro", "Andijon", "Farg'ona", "Namangan"].map((city) => {
            const active = props.salonCity.trim().toLowerCase() === city.toLowerCase();
            return (
              <button
                key={city}
                type="button"
                onClick={() => props.setSalonCity(city)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-medium transition-[var(--transition-smooth)]",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:border-foreground/50",
                )}
              >
                {city}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FloatingInput
          label="Shahar"
          required
          value={props.salonCity}
          onChange={props.setSalonCity}
        />
        <FloatingInput
          label="Mo'ljal (ixtiyoriy)"
          value={props.salonLandmark}
          onChange={props.setSalonLandmark}
        />
      </div>
      <FloatingInput
        label="Ko'cha, uy raqami"
        required
        value={props.salonAddress}
        onChange={props.setSalonAddress}
      />
    </Section>
  );
}

/* ============================================================
   Sub-step 2 — Salon Cover
   ============================================================ */

function SalonCoverStep(props: {
  cover: string | null;
  setCover: (v: string | null) => void;
  coverDrag: boolean;
  setCoverDrag: (v: boolean) => void;
  handleCoverFile: (f: FileList | null) => void;
}) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  return (
    <Section
      icon={<ImageIcon className="h-4 w-4" />}
      label="Media"
      title="Cover rasm"
      description="Bosh sahifada chiroyli ko'rinishi uchun (ixtiyoriy)."
    >
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          props.handleCoverFile(e.target.files);
          e.target.value = "";
        }}
      />
      {props.cover ? (
        <div className="group relative h-56 w-full overflow-hidden rounded-2xl border border-border bg-muted sm:h-72">
          <img src={props.cover} alt="Salon cover" className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
              <Check className="h-3 w-3" /> Yuklandi
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-background/90 px-3 text-[11px] font-semibold text-foreground backdrop-blur transition-[var(--transition-smooth)] hover:bg-background"
              >
                <UploadCloud className="h-3 w-3" /> O'zgartirish
              </button>
              <button
                type="button"
                onClick={() => props.setCover(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground backdrop-blur transition-[var(--transition-smooth)] hover:bg-destructive hover:text-destructive-foreground"
                aria-label="O'chirish"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            props.setCoverDrag(true);
          }}
          onDragLeave={() => props.setCoverDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            props.setCoverDrag(false);
            props.handleCoverFile(e.dataTransfer.files);
          }}
          className={cn(
            "group flex h-56 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-muted/30 transition-[var(--transition-smooth)] sm:h-72",
            props.coverDrag
              ? "border-foreground bg-muted"
              : "border-border hover:border-foreground/40 hover:bg-muted/50",
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-[var(--shadow-soft)] transition-transform group-hover:scale-110">
            <UploadCloud className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">Cover rasm yuklash</span>
          <span className="text-[11px] text-muted-foreground">
            Surib qo'ying yoki bosing · PNG, JPG · 10MB gacha
          </span>
        </button>
      )}
    </Section>
  );
}

/* ============================================================
   Sub-step 3 — Barber profile (personal)
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
      description="Mijozlar sizni shu ism va rasm bilan ko'radi."
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
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
            className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-2xl font-semibold uppercase text-muted-foreground transition-[var(--transition-smooth)] hover:border-foreground"
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
   Sub-step 4 — Services
   ============================================================ */

function BarberServicesStep(props: {
  services: Service[];
  addService: () => void;
  removeService: (id: string) => void;
  updateService: (id: string, k: keyof Service, v: string) => void;
}) {
  const PRESETS: Array<{ name: string; price: string; duration: string }> = [
    { name: "Soch olish", price: "60000", duration: "30" },
    { name: "Soqol olish", price: "40000", duration: "20" },
    { name: "Bolalar uchun", price: "50000", duration: "25" },
    { name: "Soch + Soqol", price: "90000", duration: "45" },
    { name: "Soch yuvish", price: "20000", duration: "15" },
  ];

  const addPreset = (p: { name: string; price: string; duration: string }) => {
    const empty = props.services.find((s) => !s.name && !s.price && !s.duration);
    if (empty) {
      props.updateService(empty.id, "name", p.name);
      props.updateService(empty.id, "price", p.price);
      props.updateService(empty.id, "duration", p.duration);
    } else {
      props.addService();
      setTimeout(() => {
        // keep UI 1:1 with upstream; no-op
      }, 0);
    }
  };

  return (
    <Section
      icon={<Scissors className="h-4 w-4" />}
      label="Xizmatlar"
      title="Sizning xizmatlaringiz"
      description="Tezda qo'shish uchun pastdagi tayyor xizmatlardan tanlang."
    >
      {/* Quick presets */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Tezkor qo'shish
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
                onClick={() => addPreset(p)}
                className={cn(
                  "group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium transition-[var(--transition-smooth)]",
                  already ? "cursor-not-allowed opacity-40" : "hover:border-foreground hover:bg-muted/60",
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
              <div className="group relative rounded-2xl border border-border bg-card p-3.5 shadow-[var(--shadow-soft)] transition-[var(--transition-smooth)] hover:border-foreground/40 sm:p-4">
                {/* number badge */}
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
                    <FloatingInput
                      label="Narxi (so'm)"
                      value={s.price}
                      onChange={(v) => props.updateService(s.id, "price", v.replace(/\D/g, ""))}
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
                    onClick={() => props.removeService(s.id)}
                    disabled={props.services.length === 1}
                    className="hidden h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-[var(--transition-smooth)] hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 disabled:hover:border-border disabled:hover:bg-background disabled:hover:text-muted-foreground sm:flex"
                    aria-label="O'chirish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {/* mobile delete */}
                <button
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

/* ============================================================
   Sub-step 5 — Schedule
   ============================================================ */

function BarberScheduleStep(props: {
  schedule: DaySchedule[];
  setSchedule: Dispatch<SetStateAction<DaySchedule[]>>;
}) {
  return (
    <Section
      icon={<CalendarDays className="h-4 w-4" />}
      label="Jadval"
      title="Ish kunlari"
      description="Ish kunlarini va dam olish kunlarini belgilang."
    >
      <ScheduleEditor schedule={props.schedule} setSchedule={props.setSchedule} />
    </Section>
  );
}

/* ============================================================
   Sub-step 6 — Languages
   ============================================================ */

function BarberLanguagesStep(props: { languages: string[]; toggleLanguage: (code: string) => void }) {
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
   Step indicator (top)
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
  const currentGroup = STEP_META[step].group;

  const salonSteps = STEP_META.map((m, i) => ({ ...m, idx: i })).filter((m) => m.group === "Salon");
  const barberSteps = STEP_META.map((m, i) => ({ ...m, idx: i })).filter((m) => m.group === "Barber");
  const salonDone = salonSteps.every((s) => stepValid[s.idx]);
  const barberActive = currentGroup === "Barber";

  return (
    <div className="mx-auto max-w-[920px] px-5 pb-5 sm:px-6">
      {/* TWO BIG GROUP ICONS — Salon · line · Barber */}
      <div className="mb-4 flex items-center justify-center gap-2 sm:gap-4">
        <GroupChip
          icon={Store}
          label="Salon"
          state={barberActive || salonDone ? "done" : currentGroup === "Salon" ? "active" : "idle"}
        />
        <GroupConnector filled={salonDone || barberActive} />
        <GroupChip
          icon={User}
          label="Barber"
          state={
            currentGroup === "Barber"
              ? stepValid.every(Boolean)
                ? "done"
                : "active"
              : "idle"
          }
        />
      </div>

      {/* Progress track with percent */}
      <div className="mb-3 flex items-center gap-3">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-foreground"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider tabular-nums text-muted-foreground">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Sub-step dots */}
      <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  "group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-[var(--transition-smooth)]",
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
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                {active && (
                  <motion.span
                    layoutId="active-ring"
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
      animate={{ scale: state === "active" ? 1.03 : 1 }}
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
      className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-7"
    >
      <div className="mb-5 flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
          {icon}
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.section>
  );
}

/* ============================================================
   Inputs
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
          compact ? "h-12 pt-4 pb-1" : "h-14 pt-5 pb-1.5",
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const has = value.length > 0;
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="peer w-full resize-none rounded-xl border border-border bg-background px-3.5 pb-3 pt-6 text-sm text-foreground outline-none transition-[var(--transition-smooth)] focus:border-foreground"
        placeholder=" "
      />
      <label
        className={cn(
          "pointer-events-none absolute left-3.5 transition-[var(--transition-smooth)]",
          has ? "top-2 text-[10px] uppercase tracking-wider text-muted-foreground" : "top-4 text-sm text-muted-foreground",
          "peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-foreground",
        )}
      >
        {label}
      </label>
    </div>
  );
}

/* ============================================================
   PhoneInput — fixed +998 prefix, format: 99 123-45-67
   ============================================================ */

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
        {/* prefix */}
        <div className="flex items-center gap-1.5 border-r border-border px-3.5">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold tabular-nums text-foreground">+998</span>
        </div>
        {/* input */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            inputMode="numeric"
            autoComplete="tel-national"
            value={formatted}
            onChange={(e) => onChange(normalizePhoneDigits(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                const el = e.currentTarget;
                const pos = el.selectionStart ?? formatted.length;
                if (pos === el.selectionEnd) {
                  const prev = formatted.slice(0, pos);
                  const after = formatted.slice(pos);
                  const stripped = (prev.replace(/\D+$/g, "").slice(0, -1) + after).replace(/\D/g, "");
                  if (prev.length && !/\d/.test(prev[prev.length - 1])) {
                    e.preventDefault();
                    onChange(normalizePhoneDigits(stripped));
                  }
                }
              }
            }}
            placeholder="99 123-45-67"
            className={cn(
              "peer h-full w-full rounded-r-xl bg-transparent px-3.5 text-sm tabular-nums text-foreground outline-none placeholder:text-muted-foreground/60",
              has ? "pt-5 pb-1.5" : "",
            )}
          />
          <label
            className={cn(
              "pointer-events-none absolute left-3.5 text-muted-foreground transition-[var(--transition-smooth)]",
              has ? "top-2 text-[10px] uppercase tracking-wider" : "top-1/2 -translate-y-1/2 text-sm",
              "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-foreground",
            )}
          >
            {label}
            {required && <span className="ml-0.5 text-foreground">*</span>}
          </label>
        </div>
        {/* status icon */}
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
          Telefon raqami 9 ta raqamdan iborat bo'lishi kerak
        </p>
      )}
    </div>
  );
}

/* ============================================================
   Schedule editor
   ============================================================ */

function ScheduleEditor({
  schedule,
  setSchedule,
}: {
  schedule: DaySchedule[];
  setSchedule: Dispatch<SetStateAction<DaySchedule[]>>;
}) {
  const update = (day: string, patch: Partial<DaySchedule>) =>
    setSchedule((prev) => prev.map((d) => (d.day === day ? { ...d, ...patch } : d)));

  const applyAll = (patch: Partial<DaySchedule>) => setSchedule((prev) => prev.map((d) => ({ ...d, ...patch })));

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
    <div className="space-y-5 sm:space-y-6">
      {/* SUMMARY STRIP */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between gap-3"
      >
        <div>
          <div className="flex items-baseline gap-1.5">
            <motion.span
              key={openCount}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-3xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl"
            >
              {openCount}
            </motion.span>
            <span className="text-sm font-semibold text-muted-foreground">/ 7 kun</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
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

      {/* PRESET PILLS */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {PRESETS.map((p) => (
          <motion.button
            key={p.key}
            whileTap={{ scale: 0.96 }}
            onClick={p.apply}
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-left transition-colors hover:border-foreground hover:bg-muted/40"
          >
            <span className="text-[12px] font-bold leading-none text-foreground">{p.label}</span>
            <span className="text-[10px] font-medium leading-none text-muted-foreground tabular-nums">{p.sub}</span>
          </motion.button>
        ))}
      </div>

      {/* HORIZONTAL DAY SELECTOR */}
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
                    layoutId="day-pill-bg"
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

      {/* SELECTED DAY EDITOR CARD */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selected.day}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tanlangan kun
              </div>
              <div className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                {WEEKDAY_LABELS[selected.day]}
              </div>
            </div>

            {/* Open / Closed toggle */}
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

          {/* Body */}
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
                  {/* TIME RANGE */}
                  <div className="mb-4 flex items-center justify-center gap-3 sm:gap-5">
                    <TimePicker
                      label="Ochilish"
                      value={selected.from}
                      onChange={(v) => update(selected.day, { from: v })}
                    />
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-2xl font-light text-muted-foreground"
                    >
                      —
                    </motion.div>
                    <TimePicker
                      label="Yopilish"
                      value={selected.to}
                      onChange={(v) => update(selected.day, { to: v })}
                    />
                  </div>

                  {/* HOUR RAIL */}
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

                  {/* QUICK HOUR CHIPS */}
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

                  {/* Apply to all */}
                  <button
                    onClick={() =>
                      setSchedule((prev) =>
                        prev.map((x) => (x.open ? { ...x, from: selected.from, to: selected.to } : x)),
                      )
                    }
                    className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-xl border border-dashed border-border bg-transparent px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-foreground hover:bg-muted/30 hover:text-foreground"
                  >
                    Bu vaqtni barcha ish kunlariga qo'llash
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
                    Yuqoridagi tugmani bosib ochsangiz bo'ladi
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

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
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
        if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === "function") {
          (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
        } else {
          el.focus();
        }
      }}
      className="group relative flex flex-1 flex-col items-center rounded-2xl border border-border bg-background px-3 py-3 transition-colors hover:border-foreground sm:px-4 sm:py-4"
    >
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-[28px]"
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
   Success overlay — full-screen celebration
   ============================================================ */

function SuccessOverlay({
  salonName,
  barberName,
  onClose,
}: {
  salonName: string;
  barberName: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-background/95 px-5 py-6 backdrop-blur-2xl"
    >
      {/* Subtle gradient backdrop */}
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
        className="relative my-auto w-full max-w-[420px] text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-6 flex flex-col items-center"
        >
          <motion.svg
            viewBox="0 0 80 80"
            className="mb-4 h-16 w-16 sm:h-20 sm:w-20"
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
            Tabriklaymiz
          </motion.span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          className="text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl"
        >
          Hammasi tayyor
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.4 }}
          className="mx-auto mt-3 max-w-[300px] text-[13px] leading-relaxed text-muted-foreground sm:text-sm"
        >
          Saloningiz va profilingiz muvaffaqiyatli yaratildi. Endi mijozlar sizni topa oladi.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.4 }}
          className="mx-auto mt-7 flex max-w-[340px] items-stretch justify-center divide-x divide-border"
        >
          <div className="flex-1 px-3">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Salon</div>
            <div className="mt-0.5 truncate text-sm font-bold text-foreground">{salonName || "—"}</div>
          </div>
          <div className="flex-1 px-3">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Barber</div>
            <div className="mt-0.5 truncate text-sm font-bold text-foreground">{barberName || "—"}</div>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.4 }}
          onClick={onClose}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background transition-colors hover:opacity-90"
        >
          Davom etish
        </motion.button>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.15, duration: 0.4 }}
          onClick={onClose}
          className="mt-2 inline-flex h-10 w-full items-center justify-center text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Yopish
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

