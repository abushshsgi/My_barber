import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { GeolocationError, getCurrentPosition } from "@mybarber/shared/geolocation";
import { useRegions } from "@/hooks/use-regions";
import { useUpdateMe } from "@/hooks/use-me";
import { validateLocation, type LocationValidation } from "@/lib/api/geo";
import { roundCoord } from "@/lib/api/list-utils";

export const ONBOARDING_STEPS = ["Ism", "Yosh", "Joylashuv"] as const;

export function useOnboardingFlow() {
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

  return {
    step,
    setStep,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    age,
    setAge,
    region,
    setRegion,
    lat,
    setLat,
    lng,
    setLng,
    locating,
    validation,
    validating,
    interestSubmitted,
    setInterestSubmitted,
    regions,
    regionsLoading,
    regionLabel,
    regionMismatch,
    noCoverage,
    detectLocation,
    canNext,
    onPrimary,
    busy,
  };
}

export type OnboardingFlowState = ReturnType<typeof useOnboardingFlow>;
