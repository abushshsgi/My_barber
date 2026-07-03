import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { MapPin, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { GeolocationError, getCurrentPosition } from "@mybarber/shared/geolocation";
import { Stepper } from "@/components/Stepper";
import { CoverageWaitlistCard } from "@/components/coverage/CoverageWaitlistCard";
import { UserAddressLocationPicker } from "@/components/address/UserAddressLocationPicker";
import { useRegions } from "@/hooks/use-regions";
import { useUpdateMe } from "@/hooks/use-me";
import { validateLocation, type LocationValidation } from "@/lib/api/geo";
import { roundCoord } from "@/lib/api/list-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Profil sozlash — mysaloon.uz" }] }),
  component: OnboardingFlow,
});

const STEPS = ["Ism", "Yosh", "Joylashuv"];

function OnboardingFlow() {
  const navigate = useNavigate();
  const updateMe = useUpdateMe();
  const { data: regions = [], isLoading: regionsLoading } = useRegions();

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [region, setRegion] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [validation, setValidation] = useState<LocationValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [interestSubmitted, setInterestSubmitted] = useState(false);
  const [gpsAttempted, setGpsAttempted] = useState(false);

  const regionLabel = regions.find((r) => r.value === region)?.label ?? "";
  const regionMismatch =
    lat != null && lng != null && region.length > 0 && validation?.matches_selected === false;
  const noCoverage =
    lat != null && lng != null && region.length > 0 && validation?.has_coverage === false;

  const runValidation = useCallback(async (nextLat: number, nextLng: number, nextRegion: string) => {
    if (!nextRegion) {
      setValidation(null);
      return;
    }
    setValidating(true);
    try {
      const v = await validateLocation(nextLat, nextLng, nextRegion);
      setValidation(v);
    } catch {
      setValidation(null);
    } finally {
      setValidating(false);
    }
  }, []);

  const detectLocation = useCallback(async () => {
    setLocating(true);
    setGpsAttempted(true);
    try {
      const pos = await getCurrentPosition();
      setLat(pos.lat);
      setLng(pos.lng);
      const v = await validateLocation(pos.lat, pos.lng, region || undefined);
      setValidation(v);
      if (v.region_from_gps) {
        setRegion((prev) => prev || v.region_from_gps);
        if (region && v.region_from_gps !== region) {
          toast.error("Joylashuvingiz tanlangan viloyatga mos emas");
        } else {
          toast.success("Joylashuv aniqlandi");
        }
      } else if (!v.in_uzbekistan) {
        toast.error("Joylashuv O'zbekiston chegarasida emas");
      } else {
        toast.success("Joylashuv aniqlandi — viloyatni tanlang");
      }
    } catch (e) {
      const msg =
        e instanceof GeolocationError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Joylashuvni aniqlab bo'lmadi";
      toast.error(msg);
    } finally {
      setLocating(false);
    }
  }, [region]);

  useEffect(() => {
    if (step !== 3 || gpsAttempted) return;
    void detectLocation();
  }, [step, gpsAttempted, detectLocation]);

  useEffect(() => {
    if (lat == null || lng == null || !region) {
      setValidation(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void runValidation(lat, lng, region);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [lat, lng, region, runValidation]);

  const canNext =
    (step === 1 && firstName.trim().length >= 2 && lastName.trim().length >= 2) ||
    (step === 2 && parseInt(age, 10) >= 10 && parseInt(age, 10) <= 100) ||
    (step === 3 &&
      region.length > 0 &&
      lat != null &&
      lng != null &&
      !regionMismatch &&
      !validating &&
      (!noCoverage || interestSubmitted));

  const finish = async () => {
    if (lat == null || lng == null) {
      toast.error("GPS orqali joylashuvni aniqlang");
      return;
    }
    const v = await validateLocation(lat, lng, region);
    if (v.matches_selected === false) {
      toast.error("Joylashuvingiz tanlangan viloyatga mos emas");
      return;
    }
    const ageNum = parseInt(age, 10);
    const birthYear = new Date().getFullYear() - ageNum;
    try {
      await updateMe.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_year: birthYear,
        region,
        latitude: roundCoord(lat),
        longitude: roundCoord(lng),
        onboarding_completed: true,
      });
      toast.success("Profil tayyor!");
      void navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saqlashda xatolik");
    }
  };

  const onPrimary = () => {
    if (step < 3) {
      if (canNext) setStep((s) => s + 1);
      return;
    }
    if (canNext) void finish();
  };

  const busy = updateMe.isPending || locating || validating;

  return (
    <div className="mobile-neo neo-page flex min-h-[100dvh] flex-col px-6 py-8 pt-safe">
      <p className="label-eyebrow">Yangi profil</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Sizni tanishib olaylik</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Bir necha qadam — keyin sizga yaqin salon va ustalarni tavsiya qilamiz.
      </p>

      <div className="mt-6">
        <Stepper steps={STEPS} current={step} />
      </div>

      <div className="flex flex-1 flex-col justify-center py-8">
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <User className="h-4 w-4" />
              Ism va familiya
            </div>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ism"
              className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3.5 text-sm font-bold focus:border-foreground focus:outline-none"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Familiya"
              className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3.5 text-sm font-bold focus:border-foreground focus:outline-none"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Calendar className="h-4 w-4" />
              Yoshingiz
            </div>
            <input
              type="number"
              inputMode="numeric"
              min={10}
              max={100}
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="Masalan: 25"
              className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3.5 text-sm font-bold focus:border-foreground focus:outline-none"
            />
            <p className="text-xs text-muted-foreground">
              Xizmatlar va tavsiyalar yoshga mos tanlanadi.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <MapPin className="h-4 w-4" />
              Joylashuv
            </div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Viloyat
            </label>
            <select
              value={region}
              disabled={regionsLoading || locating}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3.5 text-sm font-bold focus:border-foreground focus:outline-none"
            >
              <option value="">Tanlang…</option>
              {regions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {regionMismatch ? (
              <p className="text-xs font-semibold text-destructive">
                Joylashuvingiz tanlangan viloyatga mos emas
              </p>
            ) : validation?.region_from_gps_label && region ? (
              <p className="text-[11px] text-muted-foreground">
                GPS: {validation.city_label || validation.region_from_gps_label}
              </p>
            ) : null}

            <UserAddressLocationPicker
              region={region}
              regionLabel={regionLabel}
              regionSyncMode="fill-empty"
              latitude={lat != null ? String(lat) : ""}
              longitude={lng != null ? String(lng) : ""}
              setLatitude={(v) => {
                const n = parseFloat(v);
                if (Number.isFinite(n)) setLat(n);
              }}
              setLongitude={(v) => {
                const n = parseFloat(v);
                if (Number.isFinite(n)) setLng(n);
              }}
              onRegionSuggestion={(code) => setRegion((prev) => prev || code)}
            />

            <button
              type="button"
              disabled={busy}
              onClick={() => void detectLocation()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-foreground/40 py-3.5 text-sm font-bold"
            >
              <MapPin className="h-4 w-4" />
              {locating
                ? "Aniqlanmoqda…"
                : lat != null
                  ? "Joylashuvni qayta aniqlash"
                  : "GPS orqali aniqlash"}
            </button>

            {noCoverage && !interestSubmitted ? (
              <CoverageWaitlistCard
                region={region}
                lat={lat}
                lng={lng}
                cityLabel={validation?.city_label}
                source="onboarding"
                onSubmitted={() => setInterestSubmitted(true)}
              />
            ) : null}

            {lat == null || lng == null ? (
              <p className="text-center text-[11px] text-muted-foreground">
                Davom etish uchun GPS orqali joylashuv talab qilinadi.
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {step > 1 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setStep((s) => s - 1)}
            className="neo-cta flex-1 py-4 text-sm font-bold"
          >
            Orqaga
          </button>
        ) : null}
        <button
          type="button"
          disabled={!canNext || busy}
          onClick={onPrimary}
          className={cn(
            "neo-cta bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-50",
            step > 1 ? "flex-[2]" : "w-full",
          )}
        >
          {busy ? "Kutilmoqda…" : step === 3 ? "Boshlash" : "Keyingi"}
        </button>
      </div>
    </div>
  );
}
