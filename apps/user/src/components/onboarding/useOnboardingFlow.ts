import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { GeolocationError, getAccuratePosition } from "@mybarber/shared/geolocation";
import { useUpdateMe } from "@/hooks/use-me";
import { roundCoord } from "@/lib/api/list-utils";

export const ONBOARDING_STEPS = ["Ism", "Yosh", "Joylashuv"] as const;

export function useOnboardingFlow() {
  const navigate = useNavigate();
  const updateMe = useUpdateMe();

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsAttempted, setGpsAttempted] = useState(false);

  const detectLocation = useCallback(async () => {
    setLocating(true);
    setGpsAttempted(true);
    try {
      const pos = await getAccuratePosition({
        enableHighAccuracy: true,
        desiredAccuracyMeters: 35,
        maxWatchMs: 12_000,
        maximumAge: 0,
      });
      setLat(pos.lat);
      setLng(pos.lng);
      toast.success("Joylashuv aniqlandi");
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
  }, []);

  useEffect(() => {
    if (step !== 3 || gpsAttempted) return;
    void detectLocation();
  }, [step, gpsAttempted, detectLocation]);

  const canNext =
    (step === 1 && firstName.trim().length >= 2 && lastName.trim().length >= 2) ||
    (step === 2 && parseInt(age, 10) >= 10 && parseInt(age, 10) <= 100) ||
    (step === 3 && lat != null && lng != null && !locating);

  const finish = async () => {
    if (lat == null || lng == null) {
      toast.error("GPS orqali joylashuvni aniqlang");
      return;
    }
    const ageNum = parseInt(age, 10);
    const birthYear = new Date().getFullYear() - ageNum;
    try {
      await updateMe.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_year: birthYear,
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

  const busy = updateMe.isPending || locating;

  return {
    step,
    setStep,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    age,
    setAge,
    lat,
    setLat,
    lng,
    setLng,
    locating,
    detectLocation,
    canNext,
    onPrimary,
    busy,
  };
}

export type OnboardingFlowState = ReturnType<typeof useOnboardingFlow>;
