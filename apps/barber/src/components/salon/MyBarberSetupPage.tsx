/**
 * MyBarber brendi ostida virtual salon — CreateSalonPage UI uslubi.
 * Tartib: Salon nomi (nik) → Profil → Joylashuv → Xizmatlar → Tillar → salon + akkaunt.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Languages,
  Loader2,
  MapPin,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
  Phone,
} from "lucide-react";

import {
  parseSomDigits,
  SomPriceInput,
  validateServicePrice,
} from "@/components/barber/SomPriceInput";
import { apiFetch, getBarberAccessToken } from "@/lib/api";
import { extractApiError, parseJsonSafe } from "@/lib/auth-ui";
import { roundCoord6, submitFlowSignup } from "@/lib/barber-signup-flow";
import { clearSignupDraft, readSignupDraft } from "@/lib/signup-draft";
import { cn } from "@/lib/utils";
import { SalonLocationPicker } from "@/components/map/SalonLocationPicker";
import { getFlowMeta } from "@/lib/barber-flow-config";

type Service = { id: string; name: string; price: string; duration: string };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const LANGUAGES = [
  { code: "uz", label: "O'zbek" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
] as const;

const STEP_META = [
  {
    short: "Salon nomi",
    title: "MyBarber orqali salon yaratish",
    subtitle:
      "Virtual salon uchun nom / nik kiriting — keyin profil, joylashuv, xizmatlar va tillarni to'ldirasiz.",
    icon: Sparkles,
  },
  {
    short: "Profil",
    title: "Barber profili",
    subtitle: "Ism, familiya, telefon va rasm — mijozlar sizni shu profil bilan ko'radi.",
    icon: User,
  },
  {
    short: "Joylashuv",
    title: "Salon joylashuvi",
    subtitle: "MyBarber salon mijozlarga qayerda ko'rinishi uchun manzil va GPS.",
    icon: MapPin,
  },
  {
    short: "Xizmatlar",
    title: "Sizning xizmatlaringiz",
    subtitle: "Mijozlar buyurtma berishi mumkin bo'lgan xizmatlar ro'yxati.",
    icon: Scissors,
  },
  {
    short: "Tillar",
    title: "Muloqot tillari",
    subtitle: "Salon va siz qaysi tillarda muloqot qilasiz.",
    icon: Languages,
  },
] as const;

const TOTAL_STEPS = STEP_META.length;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

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

/** Ish jadvali UI yo'q — CreateSalon defaulti bilan membership soatlari yaratiladi. */
function defaultScheduleRows() {
  return WEEKDAYS.map((day, i) => ({
    day,
    open: i < 6,
    from: "09:00",
    to: "20:00",
  }));
}

export function MyBarberSetupPage() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  /** Birinchi qadam: mijozlarga ko'rinadigan nomning "MyBarber · " dan keyingi qismi (nik / salon nomi). */
  const [salonNick, setSalonNick] = useState("");

  const [salonCity, setSalonCity] = useState("");
  const [salonLandmark, setSalonLandmark] = useState("");
  const [salonAddress, setSalonAddress] = useState("");
  const [salonLatitude, setSalonLatitude] = useState("");
  const [salonLongitude, setSalonLongitude] = useState("");

  const [services, setServices] = useState<Service[]>([
    { id: uid(), name: "", price: "", duration: "" },
  ]);
  const [languages, setLanguages] = useState<string[]>(["uz"]);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!getBarberAccessToken()) {
        const d = readSignupDraft();
        if (!d || d.flow !== "mybarber") {
          await navigate({ to: "/auth" });
        }
        return;
      }
      try {
        const meRes = await apiFetch("/api/v1/barber/auth/me/");
        const meRaw = await parseJsonSafe(meRes);
        if (meRes.ok && meRaw && typeof meRaw === "object") {
          const me = meRaw as { full_name?: string; phone?: string; avatar?: string };
          const full = ((me.full_name || "") as string).trim();
          const parts = full.split(/\s+/).filter(Boolean);
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");
          let ph = ((me.phone || "") as string).replace(/\D/g, "");
          if (ph.startsWith("998")) ph = ph.slice(3);
          setPhoneDigits(ph.slice(0, 9));
          if (me.avatar && typeof me.avatar === "string") setAvatarPreview(me.avatar);
        }
        const pr = await apiFetch("/api/v1/barber/profile/");
        const pb = await parseJsonSafe(pr);
        if (pr.ok && pb && typeof pb === "object" && (pb as { exists?: boolean }).exists) {
          const b = pb as {
            location_text?: string;
            latitude?: string | number | null;
            longitude?: string | number | null;
            spoken_languages?: string[];
          };
          if (b.latitude != null) setSalonLatitude(String(b.latitude));
          if (b.longitude != null) setSalonLongitude(String(b.longitude));
          if (b.location_text) {
            const seg = String(b.location_text)
              .split(",")
              .map((s) => s.trim());
            if (seg[0]) setSalonCity(seg[0]);
            if (seg[1]) setSalonAddress(seg.slice(1).join(", "));
          }
          const langs = b.spoken_languages;
          if (Array.isArray(langs) && langs.length > 0) {
            const ok = new Set<string>(LANGUAGES.map((l) => l.code));
            const n = langs.filter((c): c is string => typeof c === "string" && ok.has(c));
            if (n.length) setLanguages(n);
          }
        }
      } catch {
        /* */
      }
    })();
  }, [navigate]);

  const stepValid = useMemo(() => {
    const nick = salonNick.trim();
    const lat = Number(salonLatitude);
    const lng = Number(salonLongitude);
    return [
      nick.length >= 2 && nick.length <= 200 && `MyBarber · ${nick}`.length <= 255,
      firstName.trim().length > 1 && lastName.trim().length > 1 && phoneDigits.length === 9,
      salonCity.trim().length > 1 &&
        salonAddress.trim().length > 2 &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180,
      // Services can be skipped; dashboard checklist will keep booking disabled.
      true,
      languages.length > 0,
    ];
  }, [
    salonNick,
    firstName,
    lastName,
    phoneDigits,
    salonCity,
    salonAddress,
    salonLatitude,
    salonLongitude,
    services,
    languages,
  ]);

  const isLast = step === TOTAL_STEPS - 1;
  const canNext = stepValid[step];
  const allValid = stepValid.every(Boolean);
  const isOptionalSetupStep = step === 3;

  const goNext = () => {
    if (!canNext || isLast) return;
    setDirection(1);
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    if (step === 0) return;
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const skipOptionalStep = () => {
    if (step === 3) {
      setServices([{ id: uid(), name: "", price: "", duration: "" }]);
    }
    setDirection(1);
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateService = (id: string, key: keyof Service, value: string) =>
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: value } : s)));

  const addService = () =>
    setServices((prev) => [...prev, { id: uid(), name: "", price: "", duration: "" }]);

  const removeService = (id: string) =>
    setServices((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));

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

  const toggleLanguage = (code: string) =>
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );

  const handleAvatar = (files: FileList | null) => {
    if (!files?.[0]) return;
    const f = files[0];
    if (!f.type.startsWith("image/")) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!allValid || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const barberPhone = `+998${phoneDigits}`;
      const locationText = [salonCity.trim(), salonAddress.trim(), salonLandmark.trim()]
        .filter(Boolean)
        .join(", ");
      const salonBrandName = `MyBarber · ${salonNick.trim()}`;
      const scheduleRows = defaultScheduleRows();
      const hoursPayload = scheduleRows
        .filter((d) => d.open)
        .map((d) => ({
          weekday: WEEKDAYS.indexOf(d.day as (typeof WEEKDAYS)[number]),
          open_time: d.from,
          close_time: d.to,
        }))
        .filter((h) => h.weekday >= 0);
      const closedWeekdays = scheduleRows
        .filter((d) => !d.open)
        .map((d) => WEEKDAYS.indexOf(d.day as (typeof WEEKDAYS)[number]))
        .filter((d) => d >= 0);

      if (!getBarberAccessToken()) {
        const draft = readSignupDraft();
        if (!draft || draft.flow !== "mybarber") {
          setSubmitError("MyBarber signup ma'lumotlari topilmadi. /auth orqali qaytadan kiring.");
          return;
        }
        try {
          await submitFlowSignup("mybarber", {
            latitude: roundCoord6(Number(salonLatitude)),
            longitude: roundCoord6(Number(salonLongitude)),
            full_name: fullName,
            phone: barberPhone,
            shop_name: salonBrandName,
            address: locationText,
          });
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : "Ro'yxatdan o'tish amalga oshmadi.");
          return;
        }
      }

      if (avatarFile) {
        const fd = new FormData();
        fd.append("full_name", fullName);
        fd.append("phone", barberPhone);
        fd.append("avatar", avatarFile);
        const meRes = await apiFetch("/api/v1/barber/auth/me/", {
          method: "PATCH",
          body: fd,
          headers: {},
        });
        const meErr = await parseJsonSafe(meRes);
        if (!meRes.ok) {
          setSubmitError(extractApiError(meErr, "Profilni saqlashda xatolik."));
          return;
        }
      } else {
        const meRes = await apiFetch("/api/v1/barber/auth/me/", {
          method: "PATCH",
          body: JSON.stringify({ full_name: fullName, phone: barberPhone }),
        });
        const meErr = await parseJsonSafe(meRes);
        if (!meRes.ok) {
          setSubmitError(extractApiError(meErr, "Profilni saqlashda xatolik."));
          return;
        }
      }

      const profRes = await apiFetch("/api/v1/barber/profile/", {
        method: "PATCH",
        body: JSON.stringify({
          location_text: locationText,
          latitude: roundCoord6(Number(salonLatitude)),
          longitude: roundCoord6(Number(salonLongitude)),
          spoken_languages: languages,
        }),
      });
      const profErr = await parseJsonSafe(profRes);
      if (!profRes.ok) {
        setSubmitError(extractApiError(profErr, "Joylashuvni saqlashda xatolik."));
        return;
      }

      const serviceRows = services.filter(
        (s) => s.name.trim() && s.price.trim() && s.duration.trim(),
      );
      for (const s of serviceRows) {
        const priceError = validateServicePrice(parseSomDigits(s.price));
        if (priceError) {
          setSubmitError(priceError);
          return;
        }
      }
      const createPayload = {
        name: salonBrandName,
        description: "MyBarber hamkor virtual salon.",
        latitude: roundCoord6(Number(salonLatitude)),
        longitude: roundCoord6(Number(salonLongitude)),
        address: locationText,
        phone: barberPhone,
        languages,
        closed_weekdays: closedWeekdays,
        hours: hoursPayload,
        services: serviceRows.map((s) => ({
          name: s.name.trim(),
          price: parseSomDigits(s.price),
          duration_minutes: Number(s.duration.replace(/\D/g, "")),
        })),
      };

      const createRes = await apiFetch("/api/v1/salons/", {
        method: "POST",
        body: JSON.stringify(createPayload),
      });
      const createBody = await parseJsonSafe(createRes);
      if (!createRes.ok) {
        setSubmitError(extractApiError(createBody, "MyBarber salon yaratishda xatolik."));
        return;
      }
      const createdId =
        createBody && typeof createBody === "object" && "id" in createBody
          ? Number((createBody as { id?: number | string }).id)
          : NaN;
      if (!Number.isFinite(createdId)) {
        setSubmitError("Salon yaratildi, lekin ID qaytmadi.");
        return;
      }

      const membershipsRes = await apiFetch("/api/v1/memberships/");
      const membershipsBody = await parseJsonSafe(membershipsRes);
      const memberships = Array.isArray(membershipsBody)
        ? membershipsBody
        : membershipsBody &&
            typeof membershipsBody === "object" &&
            Array.isArray((membershipsBody as { results?: unknown }).results)
          ? ((membershipsBody as { results: unknown[] }).results ?? [])
          : [];
      if (!membershipsRes.ok || !Array.isArray(memberships)) {
        setSubmitError("Membership ro'yxatini olishda xatolik.");
        return;
      }
      const ownerMembership = (
        memberships as Array<{ id: number; salon: number; role: string }>
      ).find((m) => Number(m.salon) === createdId && m.role === "owner");
      if (!ownerMembership) {
        setSubmitError("Owner membership topilmadi.");
        return;
      }
      const schedulePromises: Promise<Response>[] = [];
      for (const row of hoursPayload) {
        schedulePromises.push(
          apiFetch("/api/v1/schedules/", {
            method: "POST",
            body: JSON.stringify({
              membership: ownerMembership.id,
              weekday: row.weekday,
              open_time: row.open_time,
              close_time: row.close_time,
              is_day_off: false,
            }),
          }),
        );
      }
      const scheduleResults = await Promise.all(schedulePromises);
      const failedSchedule = scheduleResults.find((r) => !r.ok);
      if (failedSchedule) {
        const schErr = await parseJsonSafe(failedSchedule);
        setSubmitError(extractApiError(schErr, "Ish jadvalini saqlashda xatolik."));
        return;
      }

      setSuccess(true);
      clearSignupDraft();
      const goDashboard = () => void navigate({ to: "/barber" });
      window.setTimeout(goDashboard, 2000);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const currentMeta = STEP_META[step];
  const flowMeta = getFlowMeta("mybarber");

  return (
    <div className="min-h-screen bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-foreground sm:pb-32">
      <AnimatePresence>
        {success && (
          <SuccessOverlay
            salonName={`MyBarber · ${firstName} ${lastName}`.trim()}
            onContinue={() => void navigate({ to: "/barber" })}
          />
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[920px] items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground sm:h-8 sm:w-8">
              <Scissors className="h-3.5 w-3.5 text-background sm:h-4 sm:w-4" />
            </div>
            <div className="flex flex-col">
            <span className="text-[13px] font-semibold tracking-tight sm:text-sm">{flowMeta.title}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                MyBarber salon
              </span>
            </div>
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
            if (i === step) return;
            if (i < step) {
              setDirection(-1);
              setStep(i);
            } else if (stepValid.slice(0, i).every(Boolean)) {
              setDirection(1);
              setStep(i);
            }
          }}
        />
      </header>

      <main className="mx-auto max-w-[920px] px-3.5 pt-5 sm:px-6 sm:pt-14">
        {step > 0 && salonNick.trim().length >= 2 && (
          <div className="mb-4 rounded-2xl border border-border bg-muted/30 px-3 py-2.5 text-center sm:mb-6 sm:px-4 sm:py-3">
            <p className="text-[11px] font-semibold text-foreground sm:text-xs">
              Salon nomi (brend):{" "}
              <span className="text-foreground">MyBarber · {salonNick.trim()}</span>
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]">
              Birinchi qadamda tanladingiz. Keyinroq tahrirlash mumkin.
            </p>
          </div>
        )}

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
              <div
                className={cn(
                  "mb-2.5 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider sm:mb-3 sm:px-2.5 sm:py-1 sm:text-[10px]",
                  flowMeta.accentClass,
                )}
              >
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground text-background sm:h-4 sm:w-4">
                  <currentMeta.icon className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                </span>
                {flowMeta.badge} · Qadam {step + 1}
              </div>
              <h1 className="text-[22px] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-5xl">
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
              <MyBarberSalonNameStep salonNick={salonNick} setSalonNick={setSalonNick} />
            )}
            {step === 1 && (
              <ProfileStep
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                phoneDigits={phoneDigits}
                setPhoneDigits={setPhoneDigits}
                avatar={avatarPreview}
                onAvatar={handleAvatar}
              />
            )}
            {step === 2 && (
              <LocationStep
                salonCity={salonCity}
                setSalonCity={setSalonCity}
                salonLandmark={salonLandmark}
                setSalonLandmark={setSalonLandmark}
                salonAddress={salonAddress}
                setSalonAddress={setSalonAddress}
                salonLatitude={salonLatitude}
                setSalonLatitude={setSalonLatitude}
                salonLongitude={salonLongitude}
                setSalonLongitude={setSalonLongitude}
              />
            )}
            {step === 3 && (
              <ServicesStep
                services={services}
                addService={addService}
                removeService={removeService}
                updateService={updateService}
                applyPreset={applyServicePreset}
              />
            )}
            {step === 4 && <LanguagesStep languages={languages} toggleLanguage={toggleLanguage} />}
          </motion.div>
        </AnimatePresence>

        {submitError && (
          <div className="mx-auto mt-4 flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-destructive sm:mt-6">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-[12px] sm:text-sm">{submitError}</p>
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[920px] items-center justify-between gap-2 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:gap-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || submitting}
            className={cn(
              "inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium transition-[var(--transition-smooth)] sm:h-11 sm:w-auto sm:px-4",
              step === 0 ? "cursor-not-allowed opacity-40" : "hover:bg-muted active:scale-[0.98]",
            )}
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Orqaga</span>
          </button>
          <div className="hidden flex-1 items-center justify-center gap-2 text-xs sm:flex">
            <span className="text-muted-foreground">Hozirgi:</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-1 font-semibold">
              <currentMeta.icon className="h-3 w-3" />
              {currentMeta.short}
            </span>
          </div>
          {isOptionalSetupStep && (
            <button
              type="button"
              onClick={skipOptionalStep}
              disabled={submitting || success}
              className="inline-flex h-11 items-center rounded-xl border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50 sm:px-4 sm:text-sm"
            >
              Keyinroq
            </button>
          )}
          {!isLast ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className={cn(
                "group inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-[var(--transition-smooth)] sm:h-11 sm:flex-none sm:min-w-[170px] sm:text-sm",
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
              type="button"
              disabled={!allValid || submitting || success}
              onClick={() => void handleSubmit()}
              className={cn(
                "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-[var(--transition-smooth)] sm:h-11 sm:flex-none sm:min-w-[170px] sm:text-sm",
                allValid && !submitting && !success
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
                  <Check className="h-4 w-4" /> Tayyor
                </>
              ) : (
                <>Salon yaratish</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

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
  return (
    <div className="mx-auto max-w-[920px] px-3.5 pb-3.5 sm:px-6 sm:pb-5">
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
          return (
            <div key={i} className="flex shrink-0 items-center gap-1 sm:flex-1">
              <button
                type="button"
                onClick={() => reachable && onJump(i)}
                disabled={!reachable}
                className={cn(
                  "group relative flex h-7 items-center justify-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-[var(--transition-smooth)] sm:h-8 sm:px-3",
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
                <span className="whitespace-nowrap">{meta.short}</span>
                {active && (
                  <motion.span
                    layoutId="mbarber-active-ring"
                    className="absolute -inset-1 rounded-full ring-2 ring-foreground/25"
                    transition={{ duration: 0.3 }}
                  />
                )}
              </button>
              {i < STEP_META.length - 1 && (
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
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px]">
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

function FloatingInput({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const has = value.length > 0;
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="peer h-14 w-full rounded-xl border border-border bg-background px-3.5 pb-1.5 pt-5 text-sm text-foreground outline-none transition-[var(--transition-smooth)] placeholder-transparent focus:border-foreground"
        placeholder={label}
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
  onChange: (d: string) => void;
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
    if (document.activeElement === el) el.setSelectionRange(len, len);
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
          Telefon 9 ta raqam bo'lishi kerak
        </p>
      )}
    </div>
  );
}

function MyBarberSalonNameStep(props: {
  salonNick: string;
  setSalonNick: (v: string) => void;
}) {
  const nick = props.salonNick.trim();
  const preview = nick.length >= 2 ? `MyBarber · ${nick}` : "MyBarber · …";
  return (
    <Section
      icon={<Sparkles className="h-4 w-4" />}
      label="Boshlash"
      title="MyBarber orqali salon yaratish"
      description="Bu yerda virtual salon ochasiz: mijozlar ilovada sizning xizmatlaringizni ko'radi va buyurtma beradi. Fizik salon bo'lmasa ham, manzil va GPS orqali joylashuvni ko'rsatishingiz mumkin."
    >
      <FloatingInput
        label="Salon nomi / nik (MyBarber dan keyin)"
        required
        value={props.salonNick}
        onChange={(v) => props.setSalonNick(v.slice(0, 200))}
      />
      <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
        Mijozlarga shu ko'rinishda chiqadi:{" "}
        <span className="font-semibold text-foreground">{preview}</span>. Keyingi qadamda profil
        (ism, telefon, rasm) to'ldirasiz.
      </p>
      <div className="rounded-xl border border-border bg-muted/25 px-3.5 py-3 text-[12px] leading-relaxed text-foreground sm:px-4 sm:py-3.5 sm:text-sm">
        <p className="font-semibold text-foreground">Keyingi qadamlar</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground marker:text-foreground/50">
          <li>
            <span className="text-foreground">Profil</span> — ism, familiya, telefon va rasm
          </li>
          <li>
            <span className="text-foreground">Joylashuv</span> — manzil va GPS
          </li>
          <li>
            <span className="text-foreground">Xizmatlar</span> — narx va davomiylik
          </li>
          <li>
            <span className="text-foreground">Tillar</span> — muloqot tillari
          </li>
        </ul>
      </div>
    </Section>
  );
}

function ProfileStep(props: {
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  phoneDigits: string;
  setPhoneDigits: (v: string) => void;
  avatar: string | null;
  onAvatar: (f: FileList | null) => void;
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
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="relative">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              props.onAvatar(e.target.files);
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

function LocationStep(props: {
  salonCity: string;
  setSalonCity: (v: string) => void;
  salonLandmark: string;
  setSalonLandmark: (v: string) => void;
  salonAddress: string;
  setSalonAddress: (v: string) => void;
  salonLatitude: string;
  setSalonLatitude: (v: string) => void;
  salonLongitude: string;
  setSalonLongitude: (v: string) => void;
}) {
  const fillCurrentLocation = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        props.setSalonLatitude(pos.coords.latitude.toFixed(6));
        props.setSalonLongitude(pos.coords.longitude.toFixed(6));
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  return (
    <Section
      icon={<MapPin className="h-4 w-4" />}
      label="Lokatsiya"
      title="Salon manzili"
      description="Mijozlar sizni topa olishi uchun aniq manzil (Create salon sahifasidagi kabi)."
    >
      <SalonLocationPicker
        city={props.salonCity}
        address={props.salonAddress}
        latitude={props.salonLatitude}
        longitude={props.salonLongitude}
        setLatitude={props.setSalonLatitude}
        setLongitude={props.setSalonLongitude}
        setAddress={props.setSalonAddress}
        setCity={props.setSalonCity}
      />
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
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <FloatingInput
          label="Latitude"
          required
          value={props.salonLatitude}
          onChange={props.setSalonLatitude}
        />
        <FloatingInput
          label="Longitude"
          required
          value={props.salonLongitude}
          onChange={props.setSalonLongitude}
        />
        <button
          type="button"
          onClick={fillCurrentLocation}
          className="h-14 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground transition-[var(--transition-smooth)] hover:border-foreground hover:bg-muted"
        >
          Joylashuvni olish
        </button>
      </div>
    </Section>
  );
}

function ServicesStep(props: {
  services: Service[];
  addService: () => void;
  removeService: (id: string) => void;
  updateService: (id: string, k: keyof Service, v: string) => void;
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
      description="Tez qo'shish uchun tayyor xizmatlardan foydalaning."
    >
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Tezkor
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
                  "inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium transition-[var(--transition-smooth)]",
                  already
                    ? "cursor-not-allowed opacity-40"
                    : "hover:border-foreground hover:bg-muted/60",
                )}
              >
                <Plus className="h-3 w-3" />
                {p.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="h-px bg-border" />
      <div className="space-y-3">
        {props.services.map((s, i) => (
          <div
            key={s.id}
            className="group relative rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)] sm:p-4"
          >
            <div className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
              {i + 1}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_100px_100px_auto] sm:items-center">
              <FloatingInput
                label="Xizmat nomi"
                value={s.name}
                onChange={(v) => props.updateService(s.id, "name", v)}
              />
              <SomPriceInput
                label="Narx"
                value={s.price}
                onChange={(digits) => props.updateService(s.id, "price", digits)}
              />
              <FloatingInput
                label="Min"
                value={s.duration}
                onChange={(v) => props.updateService(s.id, "duration", v.replace(/\D/g, ""))}
              />
              <button
                type="button"
                onClick={() => props.removeService(s.id)}
                disabled={props.services.length === 1}
                className="hidden h-12 w-12 items-center justify-center rounded-xl border border-border sm:flex"
                aria-label="O'chirish"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={props.addService}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-3 text-sm font-semibold hover:border-foreground hover:bg-muted/40"
        >
          <Plus className="h-4 w-4" /> Xizmat qo'shish
        </button>
      </div>
    </Section>
  );
}

function LanguagesStep(props: { languages: string[]; toggleLanguage: (code: string) => void }) {
  return (
    <Section
      icon={<Languages className="h-4 w-4" />}
      label="Tillar"
      title="Muloqot tillari"
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
                  : "border-border bg-card hover:border-foreground/40",
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

function SuccessOverlay({
  salonName,
  onContinue,
}: {
  salonName: string;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 px-4 backdrop-blur-2xl"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md text-center"
      >
        <Check className="mx-auto mb-4 h-14 w-14 text-foreground" />
        <h2 className="text-2xl font-bold text-foreground">MyBarber salon tayyor</h2>
        <p className="mt-2 text-sm text-muted-foreground">{salonName}</p>
        <button
          type="button"
          onClick={onContinue}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background transition-colors hover:opacity-90"
        >
          Dashboardga o'tish
        </button>
        <p className="mt-3 text-xs text-muted-foreground">Avtomatik yo'naltirish…</p>
      </motion.div>
    </motion.div>
  );
}
