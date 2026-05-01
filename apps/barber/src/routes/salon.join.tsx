import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  Store,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { submitEmployeeRegisterAndJoin, roundCoord6 } from "@/lib/barber-signup-flow";
import { readSignupDraft } from "@/lib/signup-draft";
import { apiFetch, apiJson, formatApiError, getBarberAccessToken } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/salon/join")({
  component: SalonJoinPage,
});

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

function friendlyError(error: unknown, fallback = "Kutilmagan xato yuz berdi. Qayta urinib ko'ring.") {
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

function SalonJoinPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedSalon, setSelectedSalon] = useState<SalonSearchHit | null>(null);
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [hasBearer, setHasBearer] = useState(false);

  const signupDraft = readSignupDraft();
  const pendingEmployeeSignup = Boolean(!hasBearer && signupDraft?.flow === "employee");

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

  const search = useSalonSearch(query, hasBearer || pendingEmployeeSignup);
  const currentLocation = useCurrentLocation();

  const canJoin = Boolean(
    selectedSalon &&
      currentLocation.location &&
      joinStatus !== "joining" &&
      joinStatus !== "success" &&
      (hasBearer || pendingEmployeeSignup),
  );
  const canSearch = query.trim().length >= MIN_QUERY_LENGTH;
  const selectedAddress = selectedSalon?.address || "Manzil kiritilmagan";

  const statusLabel = useMemo(() => {
    if (joinStatus === "success") return "Ulandi";
    if (joinStatus === "joining") return "Ulanmoqda";
    if (selectedSalon && currentLocation.location) return "Tayyor";
    if (selectedSalon) return "Lokatsiya kerak";
    return "Salon tanlang";
  }, [currentLocation.location, joinStatus, selectedSalon]);

  const handleSelectSalon = (salon: SalonSearchHit) => {
    setSelectedSalon(salon);
    setJoinError(null);
  };

  const handleJoin = async () => {
    if (!selectedSalon || !currentLocation.location) {
      toast.error("Salon va lokatsiyani tanlang.");
      return;
    }

    setJoinStatus("joining");
    setJoinError(null);

    try {
      if (hasBearer) {
        await joinSalon({
          salon_id: selectedSalon.id,
          latitude: roundCoord6(currentLocation.location.latitude),
          longitude: roundCoord6(currentLocation.location.longitude),
        });
      } else if (pendingEmployeeSignup && signupDraft?.flow === "employee") {
        await submitEmployeeRegisterAndJoin({
          salon_id: selectedSalon.id,
          latitude: currentLocation.location.latitude,
          longitude: currentLocation.location.longitude,
        });
        setHasBearer(true);
      } else {
        toast.error("Avval barber akkaunt bilan kirish kerak.");
        navigate({ to: "/auth" });
        setJoinStatus("idle");
        return;
      }
      setJoinStatus("success");
      toast.success(`${selectedSalon.name} saloniga muvaffaqiyatli qo'shildingiz.`);
    } catch (err) {
      const message = friendlyError(err, "Salonga qo'shilib bo'lmadi.");
      setJoinStatus("error");
      setJoinError(message);
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-foreground sm:pb-32">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[920px] items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground sm:h-8 sm:w-8">
              <Store className="h-3.5 w-3.5 text-background sm:h-4 sm:w-4" />
            </div>
            <span className="text-[13px] font-semibold tracking-tight sm:text-sm">Salon Join</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground sm:text-xs">
            <span className="text-muted-foreground">Holat:</span>
            <span>{statusLabel}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[920px] px-3.5 pt-5 sm:px-6 sm:pt-14">
        <div className="mb-6 overflow-hidden text-center sm:mb-10">
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground sm:mb-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground text-background sm:h-4 sm:w-4">
              <UserRoundCheck className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
            </span>
            Employee flow · Salon join
          </div>
          <h1 className="text-[22px] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-5xl">
            Salonga ishchi sifatida qo'shiling
          </h1>
          <p className="mx-auto mt-2 max-w-[520px] px-1 text-[12.5px] leading-snug text-muted-foreground sm:mt-3 sm:px-0 sm:text-base">
            {pendingEmployeeSignup
              ? "GPS bilan joylashuving, salonni qidiring va tanlang. Pastki tugma akkauntingizni yaratadi hamda tanlangan salonga qoʻshadi — salon bilan ~100 m ichida turishingiz kerak."
              : "Barber akkaunt bilan kirgach salonni serverdan qidirib tanlang, joylashuvni yuboring va salonga ulanishni tasdiqlang (taxminan 100 m ichida turishingiz kerak)."}
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {pendingEmployeeSignup && (
            <Section
              icon={<Crosshair className="h-4 w-4" />}
              label="Qadam 1"
              title="Joylashuv"
              description="GPS bilan joriy nuqtani oling. Akkaunt va membership pastki tugma bilan — salon tanlangandan keyin va masofa mos kelganda — bir vaqtning o‘zida yaratiladi."
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={currentLocation.requestLocation}
                  disabled={currentLocation.status === "locating"}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-[var(--transition-smooth)]",
                    currentLocation.status === "locating"
                      ? "cursor-not-allowed opacity-70"
                      : "cursor-pointer hover:bg-muted active:scale-[0.98]",
                  )}
                >
                  {currentLocation.status === "locating" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  {currentLocation.location ? "Lokatsiyani yangilash" : "Mening lokatsiyam"}
                </button>
                <span className="text-[11px] text-muted-foreground">
                  Eng yaxshi aniqlik uchun salonda turgan holda oling.
                </span>
              </div>

              {currentLocation.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Lokatsiya olinmadi</AlertTitle>
                  <AlertDescription>{currentLocation.error}</AlertDescription>
                </Alert>
              )}

              {currentLocation.location && (
                <div className="grid gap-3 rounded-2xl border border-border bg-background p-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Latitude</p>
                    <p className="mt-1 font-semibold text-foreground">
                      {formatCoordinate(currentLocation.location.latitude)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Longitude</p>
                    <p className="mt-1 font-semibold text-foreground">
                      {formatCoordinate(currentLocation.location.longitude)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Aniqlik</p>
                    <p className="mt-1 font-semibold text-foreground">
                      {currentLocation.location.accuracy
                        ? `${Math.round(currentLocation.location.accuracy)} m`
                        : "Noma'lum"}
                    </p>
                  </div>
                </div>
              )}
            </Section>
          )}

          <Section
            icon={<Search className="h-4 w-4" />}
            label={pendingEmployeeSignup ? "Qadam 2" : "Qadam 1"}
            title="Salon qidirish"
            description="Salon nomini kiriting va ro'yxatdan birini tanlang."
          >
            {!hasBearer && pendingEmployeeSignup && (
              <Alert className="border-border bg-muted/30">
                <UserRoundCheck className="h-4 w-4 text-foreground" />
                <AlertTitle>Employee ro‘yxatdan o‘tish</AlertTitle>
                <AlertDescription>
                  Salonni qidiring va tanlang. Pastki tugma akkauntingizni yaratadi va tanlangan salonga qoʻshadi
                  (GPS salon bilan taxminan 100 m ichida bo‘lishi kerak).
                </AlertDescription>
              </Alert>
            )}
            {!hasBearer && !pendingEmployeeSignup && (
              <Alert className="border-border bg-muted/30">
                <UserRoundCheck className="h-4 w-4 text-foreground" />
                <AlertTitle>Kirish zarur</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    Salon qidiruvi va ulanish uchun barber akkaunt bilan kirilgan bo&apos;lishingiz kerak
                    — so&apos;rovlar <code className="rounded bg-muted px-1 py-0.5 text-xs">Bearer</code> JWT
                    bilan ketadi.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/auth" })}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[13px] font-semibold text-foreground transition-[var(--transition-smooth)] hover:bg-muted active:scale-[0.98]"
                  >
                    Kirish / Ro‘yxatdan o‘tish
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </AlertDescription>
              </Alert>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedSalon(null);
                  setJoinError(null);
                }}
                placeholder="Masalan: Premium Barber"
                disabled={!hasBearer && !pendingEmployeeSignup}
                className={cn(
                  "h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-[var(--transition-smooth)] placeholder:text-muted-foreground focus:border-foreground",
                  !hasBearer && !pendingEmployeeSignup && "cursor-not-allowed opacity-60",
                )}
                aria-label="Salon nomi bo'yicha qidirish"
              />
            </div>

            {search.status === "searching" && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Salonlar qidirilmoqda...
              </div>
            )}

            {search.status === "error" && search.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Qidiruv xatosi</AlertTitle>
                <AlertDescription>{search.error}</AlertDescription>
              </Alert>
            )}

            {search.status === "empty" && canSearch && (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                <Store className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">
                  {!hasBearer && !pendingEmployeeSignup
                    ? "Salonlar ro‘yxati uchun kirish kerak"
                    : "Salon topilmadi"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {!hasBearer && !pendingEmployeeSignup
                    ? "/auth sahifasidan kirgach qidiruv avtomatik serverdan yuklanadi."
                    : "Nomni boshqacha yozib qidirib ko‘ring yoki boshqa salon nomidan urinib ko‘ring."}
                </p>
              </div>
            )}

            {search.results.length > 0 && (
              <div className="grid gap-3">
                {search.results.map((salon) => {
                  const selected = selectedSalon?.id === salon.id;
                  return (
                    <button
                      key={salon.id}
                      type="button"
                      onClick={() => handleSelectSalon(salon)}
                      className={cn(
                        "cursor-pointer rounded-2xl border border-border bg-card p-4 text-left shadow-[var(--shadow-soft)] transition-[var(--transition-smooth)] hover:border-foreground/40",
                        selected && "border-foreground bg-muted/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-foreground" />
                            <p className="font-semibold text-foreground">{salon.name}</p>
                          </div>
                          <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{salon.address || "Manzil kiritilmagan"}</span>
                          </p>
                        </div>
                        {selected && (
                          <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground">
                            Tanlandi
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          {!pendingEmployeeSignup && (
          <Section
            icon={<Crosshair className="h-4 w-4" />}
            label="Qadam 2"
            title="Lokatsiyani tasdiqlash"
            description="Join uchun joriy lokatsiyani yuboring (100m qoidasi)."
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={currentLocation.requestLocation}
                disabled={currentLocation.status === "locating"}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-[var(--transition-smooth)]",
                  currentLocation.status === "locating"
                    ? "cursor-not-allowed opacity-70"
                    : "cursor-pointer hover:bg-muted active:scale-[0.98]",
                )}
              >
                {currentLocation.status === "locating" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                {currentLocation.location ? "Lokatsiyani yangilash" : "Mening lokatsiyam"}
              </button>

              <span className="text-[11px] text-muted-foreground">
                Eng yaxshi aniqlik uchun salonda turgan holatda bosing.
              </span>
            </div>

            {currentLocation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Lokatsiya olinmadi</AlertTitle>
                <AlertDescription>{currentLocation.error}</AlertDescription>
              </Alert>
            )}

            {currentLocation.location && (
              <div className="grid gap-3 rounded-2xl border border-border bg-background p-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Latitude</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {formatCoordinate(currentLocation.location.latitude)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Longitude</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {formatCoordinate(currentLocation.location.longitude)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Aniqlik</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {currentLocation.location.accuracy
                      ? `${Math.round(currentLocation.location.accuracy)} m`
                      : "Noma'lum"}
                  </p>
                </div>
              </div>
            )}
          </Section>
          )}

          <Section
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Qadam 3"
            title="Join ma'lumotlari"
            description="Tanlangan salon va holatni tekshirib, arizani yuboring."
          >
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tanlangan salon
              </div>
              {selectedSalon ? (
                <div className="mt-2">
                  <p className="font-semibold text-foreground">{selectedSalon.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedAddress}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Hozircha tanlanmagan.</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    joinStatus === "success"
                      ? "bg-green-500"
                      : canJoin
                        ? "bg-blue-500"
                        : "bg-muted-foreground",
                  )}
                />
                <span className="text-sm font-medium">{statusLabel}</span>
              </div>
            </div>

            <div className="grid gap-3">
              <ChecklistItem done={Boolean(selectedSalon)} label="Salon tanlandi" />
              <ChecklistItem done={Boolean(currentLocation.location)} label="Lokatsiya olindi" />
              <ChecklistItem done={joinStatus === "success"} label="Membership faollashtirildi" />
            </div>

            {joinError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Qo'shilish xatosi</AlertTitle>
                <AlertDescription>{joinError}</AlertDescription>
              </Alert>
            )}

            {joinStatus === "success" && (
              <Alert className="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Salonga qo'shildingiz</AlertTitle>
                <AlertDescription>
                  Endi barber panelida salon bilan bog'liq ma'lumotlarni ko'rishingiz mumkin.
                </AlertDescription>
              </Alert>
            )}
          </Section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[920px] items-center justify-between gap-2 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:gap-3 sm:px-6 sm:py-4">
          <button
            onClick={() => navigate({ to: hasBearer ? "/barber" : "/auth" })}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-[var(--transition-smooth)] hover:bg-muted active:scale-[0.98] sm:h-11 sm:w-auto sm:px-4"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Orqaga</span>
          </button>

          <div className="hidden flex-1 items-center justify-center gap-2 text-xs sm:flex">
            <span className="text-muted-foreground">Eslatma:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 font-semibold text-foreground">
              Bitta barber uchun bitta faol salon
            </span>
          </div>

          <div className="flex items-center gap-2">
            {joinStatus === "success" && (
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-[13px] font-semibold text-foreground transition-[var(--transition-smooth)] hover:bg-muted"
                onClick={() => navigate({ to: "/barber" })}
              >
                Barber panel
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleJoin}
              disabled={!canJoin}
              className={cn(
                "inline-flex h-11 min-w-[170px] items-center justify-center gap-2 overflow-hidden rounded-xl px-4 text-[13px] font-semibold transition-[var(--transition-smooth)] sm:text-sm",
                canJoin
                  ? "cursor-pointer bg-foreground text-background hover:scale-[1.02] active:scale-[0.98]"
                  : "cursor-not-allowed bg-muted text-muted-foreground",
              )}
            >
              {joinStatus === "joining" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Yuborilmoqda...
                </>
              ) : joinStatus === "success" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Muvaffaqiyatli
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />{" "}
                  {pendingEmployeeSignup ? "Akkaunt yaratish va salonga qo'shilish" : "Salonga qo'shilish"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full border text-xs",
          done
            ? "border-green-500 bg-green-500 text-white"
            : "border-muted-foreground/30 text-muted-foreground",
        )}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : null}
      </span>
      <span className={cn("text-sm", done ? "font-medium text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
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
  icon: ReactNode;
  label: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-3.5 shadow-[var(--shadow-card)] sm:p-7">
      <div className="mb-4 flex items-start gap-3 sm:mb-5">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background shadow-[var(--shadow-soft)]">
          {icon}
        </div>
        <div>
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
      <div className="space-y-4">{children}</div>
    </section>
  );
}

