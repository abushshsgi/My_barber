import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crosshair,
  Loader2,
  MapPin,
  Navigation,
  Scissors,
  Search,
  ShieldCheck,
  Store,
  UserRoundCheck,
  X,
  AlertCircle,
} from "lucide-react";
import { GpsLocationPreviewMap } from "@/components/map/GpsLocationPreviewMap";

import { submitEmployeeRegisterAndJoin, roundCoord6 } from "@/lib/barber-signup-flow";
import { readSignupDraft } from "@/lib/signup-draft";
import {
  apiFetch,
  apiJson,
  formatApiError,
  clearBarberTokens,
  getBarberAccessToken,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { getFlowMeta } from "@/lib/barber-flow-config";

export const Route = createFileRoute("/salon/join/")({
  component: SalonJoinPage,
});

/* ============================================================
   Types
   ============================================================ */

type SalonSearchHit = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type JoinPayload = {
  salon_id: number;
  latitude: number;
  longitude: number;
};

type JoinResponse = {
  detail: "joined";
  membership_id: number;
  salon_id: number;
};

type CurrentLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

type SearchStatus = "idle" | "searching" | "success" | "empty" | "error";
type LocationStatus = "idle" | "locating" | "success" | "error";
type JoinStatus = "idle" | "joining" | "success" | "error";

const MIN_QUERY_LENGTH = 1;
const SEARCH_DEBOUNCE_MS = 300;

/* ============================================================
   Step metadata — matches CreateSalonPage shape
   ============================================================ */

const STEP_META = [
  {
    group: "Salon",
    short: "Qidirish",
    title: "Salonni toping",
    subtitle: "Salon nomini yozing va ro'yxatdan birini tanlang — keyin masofa tasdiqlanadi.",
    icon: Search,
  },
  {
    group: "Salon",
    short: "Lokatsiya",
    title: "Joriy joylashuvingiz",
    subtitle:
      "GPS yoqib turganda eng aniq natija. Salonga taxminan 100 m ichida bo'lishingiz kerak. Keyin «Salonga qo'shilish» — profil va jadval alohida sahifada.",
    icon: Crosshair,
  },
] as const;

const TOTAL_STEPS = STEP_META.length;

/* ============================================================
   Helpers
   ============================================================ */

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

async function fetchSalonSearch(trimmed: string, signal?: AbortSignal): Promise<SalonSearchHit[]> {
  const res = await apiFetch(`/api/v1/salons/search/?q=${encodeURIComponent(trimmed)}`, { signal });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(formatApiError(body, "Salon qidiruvda xato yuz berdi."));
  }
  return Array.isArray(body) ? (body as SalonSearchHit[]) : [];
}

async function joinSalon(payload: JoinPayload): Promise<JoinResponse> {
  return apiJson<JoinResponse>("/api/v1/salons/join/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function friendlyError(
  error: unknown,
  fallback = "Kutilmagan xato yuz berdi. Qayta urinib ko'ring.",
) {
  const message = error instanceof Error ? error.message : String(error || "");
  const lower = message.toLowerCase();

  if (lower.includes("joylashuv") || lower.includes("100 m")) {
    return "Siz salon joylashuvidan 100 metr ichida bo'lishingiz kerak. Salonga yaqinroq joydan qayta urinib ko'ring.";
  }
  if (lower.includes("faqat sartarosh") || lower.includes("barber")) {
    return "Bu amal faqat barber akkaunt orqali bajariladi. Barber hisobingiz bilan kiring.";
  }
  if (lower.includes("egasi") || lower.includes("owner")) {
    return "Salon egasi boshqa salonga ishchi sifatida qo'shila olmaydi.";
  }
  if (lower.includes("latitude") || lower.includes("longitude") || lower.includes("koordinata")) {
    return "Joylashuv koordinatalari noto'g'ri. Lokatsiyani qayta oling.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Server bilan aloqa bo'lmadi. Internet yoki backend holatini tekshiring.";
  }
  if (
    lower.includes("authentication credentials") ||
    lower.includes("not provided") ||
    lower.includes("given token not valid") ||
    (lower.includes("credentials") && lower.includes("provided"))
  ) {
    return "Sistemaga kirilmagan. Barber akkauntingiz bilan /auth sahifasidan kirish zarur.";
  }

  return message.trim() || fallback;
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

/* ============================================================
   Hooks
   ============================================================ */

function useSalonSearch(query: string, allowSearch: boolean) {
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [results, setResults] = useState<SalonSearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setStatus("idle");
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setError(null);

      if (!allowSearch) {
        setResults([]);
        setStatus(trimmed.length >= MIN_QUERY_LENGTH ? "empty" : "idle");
        return;
      }

      setStatus("searching");
      fetchSalonSearch(trimmed, controller.signal)
        .then((items) => {
          setResults(items);
          setStatus(items.length ? "success" : "empty");
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setResults([]);
          setStatus("error");
          setError(friendlyError(err, "Salonlarni qidirib bo'lmadi."));
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, allowSearch]);

  return { status, results, error };
}

function useCurrentLocation() {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi.");
      return;
    }

    setStatus("locating");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setStatus("success");
      },
      (geoError) => {
        setStatus("error");
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError("Lokatsiya ruxsati berilmadi. Brauzer sozlamalaridan ruxsat bering.");
        } else if (geoError.code === geoError.TIMEOUT) {
          setError("Lokatsiya olish vaqti tugadi. Qayta urinib ko'ring.");
        } else {
          setError("Lokatsiyani aniqlab bo'lmadi. GPS yoki internetni tekshiring.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      },
    );
  };

  return { status, location, error, requestLocation };
}

/* ============================================================
   Page
   ============================================================ */

function SalonJoinPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedSalon, setSelectedSalon] = useState<SalonSearchHit | null>(null);
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [hasBearer, setHasBearer] = useState(false);

  const signupDraft = readSignupDraft();
  const employeeSignupDraft = signupDraft?.flow === "employee";

  useEffect(() => {
    function syncBearer() {
      setHasBearer(Boolean(getBarberAccessToken()));
    }
    syncBearer();
    window.addEventListener("focus", syncBearer);
    window.addEventListener("storage", syncBearer);
    return () => {
      window.removeEventListener("focus", syncBearer);
      window.removeEventListener("storage", syncBearer);
    };
  }, []);

  // Salon qidiruv API AllowAny — signup draft yo‘qolsa ham qidiruv ishlashi kerak.
  const search = useSalonSearch(query, true);
  const currentLocation = useCurrentLocation();

  // Wizard step state
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const stepValid = useMemo(() => {
    return [
      Boolean(selectedSalon),
      Boolean(currentLocation.location),
    ];
  }, [selectedSalon, currentLocation.location]);

  const isLast = step === TOTAL_STEPS - 1;
  const canNext = stepValid[step];
  const canJoin = Boolean(
    selectedSalon &&
    currentLocation.location &&
    joinStatus !== "joining" &&
    joinStatus !== "success" &&
    (hasBearer || employeeSignupDraft),
  );

  const goNext = () => {
    if (!canNext || isLast) return;
    setDirection(1);
    setJoinError(null);
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    if (step === 0) return;
    setDirection(-1);
    setJoinError(null);
    setStep((s) => Math.max(0, s - 1));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /** Auto-advance to setup wizard after success. */
  useEffect(() => {
    if (joinStatus !== "success") return;
    if (!getBarberAccessToken()) return;
    const id = window.setTimeout(() => {
      void navigate({ to: "/salon/join/setup", replace: true });
    }, 300);
    return () => window.clearTimeout(id);
  }, [joinStatus, navigate]);

  const handleSelectSalon = (salon: SalonSearchHit) => {
    setSelectedSalon(salon);
    setJoinError(null);
  };

  const statusLabel = useMemo(() => {
    if (joinStatus === "success") return "Ulandi";
    if (joinStatus === "joining") return "Ulanmoqda";
    if (selectedSalon && currentLocation.location) return "Tayyor";
    if (selectedSalon) return "Lokatsiya kerak";
    return "Salon tanlang";
  }, [currentLocation.location, joinStatus, selectedSalon]);

  const handleJoin = async () => {
    if (!selectedSalon || !currentLocation.location) {
      toast.error("Salon va lokatsiyani tanlang.");
      return;
    }

    setJoinStatus("joining");
    setJoinError(null);

    try {
      if (employeeSignupDraft) {
        await submitEmployeeRegisterAndJoin({
          salon_id: selectedSalon.id,
          latitude: currentLocation.location.latitude,
          longitude: currentLocation.location.longitude,
        });
        setHasBearer(true);
      } else if (hasBearer) {
        await joinSalon({
          salon_id: selectedSalon.id,
          latitude: roundCoord6(currentLocation.location.latitude),
          longitude: roundCoord6(currentLocation.location.longitude),
        });
      } else {
        toast.error("Avval barber akkaunt bilan kirish kerak.");
        navigate({ to: "/auth" });
        setJoinStatus("idle");
        return;
      }
      setJoinStatus("success");
      toast.success(`${selectedSalon.name} saloniga muvaffaqiyatli qo'shildingiz.`);
    } catch (err) {
      let message = friendlyError(err, "Salonga qo'shilib bo'lmadi.");
      const raw = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      const authBroken =
        raw.includes("authentication credentials") ||
        raw.includes("not provided") ||
        raw.includes("given token not valid") ||
        (raw.includes("credentials") && raw.includes("provided"));
      if (!employeeSignupDraft && authBroken) {
        clearBarberTokens();
        setHasBearer(false);
        message =
          "Sessiya eskirgan yoki token noto‘g‘ri. Qayta kiring va salonga qoʻshilishni takrorlang.";
      }
      setJoinStatus("error");
      setJoinError(message);
      toast.error(message);
    }
  };

  const currentMeta = STEP_META[step];
  const flowMeta = getFlowMeta("employee");

  return (
    <div className="min-h-screen bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-foreground sm:pb-32">
      {/* Success overlay */}
      <AnimatePresence>
        {joinStatus === "success" && (
          <SuccessOverlay
            salonName={selectedSalon?.name || ""}
            onContinue={() => void navigate({ to: "/salon/join/setup", replace: true })}
            onClose={() => void navigate({ to: "/barber" })}
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
            <span className="text-[13px] font-semibold tracking-tight sm:text-sm">{flowMeta.title}</span>
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
              <h1 className="onboarding-title text-foreground">
                {currentMeta.title}
              </h1>
              <p className="mx-auto mt-2 max-w-[520px] px-1 text-[12.5px] leading-snug text-muted-foreground sm:mt-3 sm:px-0 sm:text-base">
                {currentMeta.subtitle}
              </p>
              <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground sm:text-xs">
                <span className="text-muted-foreground">Holat:</span>
                <span>{statusLabel}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Auth gate — show once at the top if user can't search/join at all */}
        {!hasBearer && !employeeSignupDraft && (
          <div className="mb-4 sm:mb-6">
            <AuthGateBanner onAuth={() => void navigate({ to: "/auth" })} />
          </div>
        )}

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
              <SalonSearchStep
                query={query}
                setQuery={(q) => {
                  setQuery(q);
                  setSelectedSalon(null);
                  setJoinError(null);
                }}
                hasAccess={hasBearer || employeeSignupDraft}
                isEmployeeSignup={employeeSignupDraft && !hasBearer}
                search={search}
                selectedSalon={selectedSalon}
                onSelectSalon={handleSelectSalon}
              />
            )}
            {step === 1 && (
              <LocationStep
                location={currentLocation.location}
                status={currentLocation.status}
                error={currentLocation.error}
                onRequest={currentLocation.requestLocation}
                joinError={joinError}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[920px] items-center justify-between gap-2 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:gap-3 sm:px-6 sm:py-4">
          <button
            onClick={() => {
              if (step === 0) {
                void navigate({ to: hasBearer ? "/barber" : "/auth" });
                return;
              }
              goBack();
            }}
            disabled={joinStatus === "joining"}
            className={cn(
              "inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-[var(--transition-smooth)] sm:h-11 sm:w-auto sm:px-4",
              joinStatus === "joining"
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

          {!isLast ? (
            <button
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
          ) : joinStatus === "success" ? (
            <button
              type="button"
              className="inline-flex h-11 min-w-0 flex-1 shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-foreground px-4 text-[13px] font-semibold text-background transition-[var(--transition-smooth)] hover:opacity-90 active:scale-[0.98] sm:min-w-[220px] sm:flex-none"
              onClick={() => void navigate({ to: "/salon/join/setup", replace: true })}
            >
              Profil va jadval · davom etish
              <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              disabled={!canJoin}
              className={cn(
                "inline-flex h-11 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl px-4 text-[13px] font-semibold transition-[var(--transition-smooth)] sm:h-11 sm:flex-none sm:min-w-[200px] sm:text-sm",
                canJoin
                  ? "bg-foreground text-background hover:scale-[1.02] active:scale-[0.98]"
                  : "cursor-not-allowed bg-muted text-muted-foreground",
              )}
            >
              {joinStatus === "joining" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Yuborilmoqda…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  {employeeSignupDraft && !hasBearer
                    ? "Akkaunt yaratish va qo‘shilish"
                    : "Salonga qo‘shilish"}
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
   Step 0 — Salon search & select
   ============================================================ */

function SalonSearchStep({
  query,
  setQuery,
  hasAccess,
  isEmployeeSignup,
  search,
  selectedSalon,
  onSelectSalon,
}: {
  query: string;
  setQuery: (v: string) => void;
  hasAccess: boolean;
  isEmployeeSignup: boolean;
  search: ReturnType<typeof useSalonSearch>;
  selectedSalon: SalonSearchHit | null;
  onSelectSalon: (s: SalonSearchHit) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canSearch = query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <Section
      icon={<Search className="h-4 w-4" />}
      label="Salon"
      title="Salonni qidiring"
      description="Salon nomini yozing — jonli qidiruv natijalardan birini tanlang."
    >
      {isEmployeeSignup && (
        <NoteCard
          icon={<UserRoundCheck className="h-4 w-4" />}
          title="Employee ro‘yxatdan o‘tish"
          description="Salonni qidiring va tanlang. Pastki tugma akkauntingizni yaratadi va tanlangan salonga qo‘shadi (GPS salon bilan ~100 m ichida bo‘lishi kerak)."
        />
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Masalan: Premium Barber"
          disabled={!hasAccess}
          className={cn(
            "h-12 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-sm text-foreground outline-none transition-[var(--transition-smooth)] placeholder:text-muted-foreground/70 focus:border-foreground sm:h-14 sm:text-[15px]",
            !hasAccess && "cursor-not-allowed opacity-60",
          )}
          aria-label="Salon nomi bo'yicha qidirish"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Tozalash"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Empty hint when no query */}
      {!canSearch && hasAccess && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-7 text-center">
          <Store className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-foreground">Salon nomini yozing</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Kamida 1 ta belgi yozsangiz, tizim avtomatik ravishda qidirib beradi.
          </p>
        </div>
      )}

      {/* Searching */}
      {search.status === "searching" && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Salonlar qidirilmoqda...
        </div>
      )}

      {/* Search error */}
      {search.status === "error" && search.error && (
        <ErrorCard title="Qidiruv xatosi" message={search.error} />
      )}

      {/* Empty after search */}
      {search.status === "empty" && canSearch && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
          <Store className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            {!hasAccess ? "Salonlar ro‘yxati uchun kirish kerak" : "Salon topilmadi"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {!hasAccess
              ? "/auth sahifasidan kirgach qidiruv avtomatik serverdan yuklanadi."
              : "Nomni boshqacha yozib qidirib ko‘ring yoki boshqa salon nomidan urinib ko‘ring."}
          </p>
        </div>
      )}

      {/* Results */}
      {search.results.length > 0 && (
        <div className="grid gap-2.5">
          <AnimatePresence initial={false}>
            {search.results.map((salon, i) => {
              const selected = selectedSalon?.id === salon.id;
              return (
                <motion.button
                  key={salon.id}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, delay: i * 0.02 }}
                  onClick={() => onSelectSalon(salon)}
                  className={cn(
                    "group relative flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-3.5 text-left shadow-[var(--shadow-soft)] transition-[var(--transition-smooth)] hover:border-foreground/40 sm:p-4",
                    selected ? "border-foreground bg-muted/40" : "border-border",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors sm:h-11 sm:w-11",
                      selected ? "bg-foreground text-background" : "bg-muted text-foreground",
                    )}
                  >
                    <Store className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[14px] font-semibold text-foreground sm:text-[15px]">
                        {salon.name}
                      </p>
                      {selected && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
                          <Check className="h-2.5 w-2.5" /> Tanlandi
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex items-start gap-1.5 text-[12px] text-muted-foreground sm:text-[12.5px]">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-2">{salon.address || "Manzil kiritilmagan"}</span>
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </Section>
  );
}

/* ============================================================
   Step 1 — Location
   ============================================================ */

function LocationStep({
  location,
  status,
  error,
  onRequest,
  joinError,
}: {
  location: CurrentLocation | null;
  status: LocationStatus;
  error: string | null;
  onRequest: () => void;
  joinError: string | null;
}) {
  return (
    <Section
      icon={<Crosshair className="h-4 w-4" />}
      label="Lokatsiya"
      title="Joriy joylashuv"
      description="GPS bilan joriy nuqtangizni oling — masofa server tomonidan tekshiriladi."
    >
      {location ? (
        <GpsLocationPreviewMap latitude={location.latitude} longitude={location.longitude} />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-border bg-muted/30 text-sm text-muted-foreground sm:h-60">
          «Mening lokatsiyam» tugmasini bosing
        </div>
      )}

      {/* CTA + accuracy hint */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRequest}
          disabled={status === "locating"}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-[var(--transition-smooth)]",
            status === "locating"
              ? "cursor-not-allowed opacity-70"
              : "cursor-pointer hover:border-foreground hover:bg-muted active:scale-[0.98]",
          )}
        >
          {status === "locating" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          {location ? "Lokatsiyani yangilash" : "Mening lokatsiyam"}
        </button>
        <span className="text-[11px] text-muted-foreground">
          Eng yaxshi aniqlik uchun salon ichida yoki yaqinida turgan holda oling.
        </span>
      </div>

      {error && <ErrorCard title="Lokatsiya olinmadi" message={error} />}
      {joinError && <ErrorCard title="Qo‘shilish xatosi" message={joinError} />}

      {/* Coord cards */}
      {location && (
        <div className="grid gap-2 sm:grid-cols-3">
          <CoordCell label="Latitude" value={formatCoordinate(location.latitude)} />
          <CoordCell label="Longitude" value={formatCoordinate(location.longitude)} />
          <CoordCell
            label="Aniqlik"
            value={location.accuracy ? `${Math.round(location.accuracy)} m` : "Noma'lum"}
          />
        </div>
      )}
    </Section>
  );
}

function CoordCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[14px] font-semibold text-foreground tabular-nums">{value}</p>
    </div>
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
  const salonDone = stepValid.every(Boolean);

  return (
    <div className="mx-auto max-w-[920px] px-3.5 pb-3.5 sm:px-6 sm:pb-5">
      <div className="mb-3 flex items-center justify-center gap-2 sm:mb-4">
        <GroupChip
          icon={Store}
          label="Salonga ulanish"
          state={salonDone ? "done" : "active"}
        />
      </div>

      {/* Progress */}
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

      {/* Sub-step dots */}
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
                    layoutId="active-ring-join"
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

/* ============================================================
   Section — same look as CreateSalonPage
   ============================================================ */

function Section({
  icon,
  label,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  description: string;
  children: ReactNode;
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
   Misc small components
   ============================================================ */

function NoteCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 px-3.5 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-foreground sm:text-sm">{title}</p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground sm:text-[12.5px]">
          {description}
        </p>
      </div>
    </div>
  );
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold sm:text-sm">{title}</p>
        <p className="mt-0.5 text-[11.5px] leading-snug sm:text-[12.5px]">{message}</p>
      </div>
    </div>
  );
}

function AuthGateBanner({ onAuth }: { onAuth: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-[var(--shadow-soft)] sm:p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
        <UserRoundCheck className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground sm:text-sm">
          Avval barber akkaunt bilan kirish kerak
        </p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground sm:text-[12.5px]">
          So‘rovlar Bearer JWT bilan ketadi — kirgach qidiruv va ulanish faollashadi.
        </p>
        <button
          type="button"
          onClick={onAuth}
          className="mt-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 text-[12.5px] font-semibold text-foreground transition-[var(--transition-smooth)] hover:bg-muted active:scale-[0.98]"
        >
          Kirish / Ro‘yxatdan o‘tish
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Success overlay — full-screen celebration
   ============================================================ */

function SuccessOverlay({
  salonName,
  onContinue,
  onClose,
}: {
  salonName: string;
  onContinue: () => void;
  onClose: () => void;
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
            Tabriklaymiz
          </motion.span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          className="onboarding-section-title text-foreground"
        >
          Salonga qo‘shildingiz
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.4 }}
          className="mx-auto mt-2.5 max-w-[300px] px-2 text-[12.5px] leading-relaxed text-muted-foreground sm:mt-3 sm:px-0 sm:text-sm"
        >
          Endi profil va ish jadvalini yakunlasangiz, mijozlar sizni topa oladi.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.4 }}
          className="mx-auto mt-6 flex max-w-[340px] items-stretch justify-center divide-x divide-border sm:mt-7"
        >
          <div className="flex-1 px-3">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Salon
            </div>
            <div className="mt-0.5 truncate text-sm font-bold text-foreground">
              {salonName || "—"}
            </div>
          </div>
          <div className="flex-1 px-3">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Membership
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
          Profil va jadvalni kiritish
          <ArrowRight className="h-4 w-4" />
        </motion.button>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.15, duration: 0.4 }}
          onClick={onClose}
          className="mt-2 inline-flex h-10 w-full items-center justify-center text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Keyinroq, Barber panelga o‘tish
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
