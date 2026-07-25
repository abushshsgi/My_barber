import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { GeolocationError, getAccuratePosition } from "@mybarber/shared/geolocation";
import { useUpdateMe } from "@/hooks/use-me";
import { roundCoord } from "@/lib/api/list-utils";
import {
  sanitizeDisplayNameInput,
  validateDisplayName,
  type DisplayNameErrorKey,
} from "@/lib/validate-display-name";

export const ONBOARDING_STEPS = ["Ism", "Yosh", "Joylashuv"] as const;

const NAME_ERROR_DEFAULTS: Record<DisplayNameErrorKey, string> = {
  nameRequired: "Ism va familiyani kiriting",
  nameInvalidChars: "Faqat harflar, bo'sh joy, defis (-) va apostrof (') ishlatiladi.",
  nameNeedsFull: "Ism va familiyani to'liq kiriting",
  namePartTooShort: "Har bir qism kamida 2 ta harfdan iborat bo'lishi kerak",
  nameTooLong: "Ism juda uzun",
  nameTooManyParts: "Ismda so'zlar soni juda ko'p",
};

export function useOnboardingFlow() {
  const navigate = useNavigate();
  const updateMe = useUpdateMe();

  const [step, setStep] = useState(1);
  const [firstName, setFirstNameRaw] = useState("");
  const [lastName, setLastNameRaw] = useState("");
  const [age, setAge] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsAttempted, setGpsAttempted] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  const setFirstName = useCallback((value: string) => {
    setNameTouched(true);
    setFirstNameRaw(sanitizeDisplayNameInput(value));
  }, []);

  const setLastName = useCallback((value: string) => {
    setNameTouched(true);
    setLastNameRaw(sanitizeDisplayNameInput(value));
  }, []);

  const nameValidation = useMemo(
    () => validateDisplayName(`${firstName} ${lastName}`),
    [firstName, lastName],
  );

  const nameError =
    nameTouched && !nameValidation.ok
      ? NAME_ERROR_DEFAULTS[nameValidation.errorKey]
      : null;

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
    (step === 1 && nameValidation.ok) ||
    (step === 2 && parseInt(age, 10) >= 10 && parseInt(age, 10) <= 100) ||
    (step === 3 && lat != null && lng != null && !locating);

  const finish = async () => {
    if (lat == null || lng == null) {
      toast.error("GPS orqali joylashuvni aniqlang");
      return;
    }
    const checked = validateDisplayName(`${firstName} ${lastName}`);
    if (!checked.ok) {
      setNameTouched(true);
      setStep(1);
      toast.error(NAME_ERROR_DEFAULTS[checked.errorKey]);
      return;
    }
    const ageNum = parseInt(age, 10);
    const birthYear = new Date().getFullYear() - ageNum;
    const [first, ...rest] = checked.value.split(" ");
    try {
      await updateMe.mutateAsync({
        first_name: first ?? "",
        last_name: rest.join(" "),
        birth_year: birthYear,
        latitude: roundCoord(lat),
        longitude: roundCoord(lng),
        onboarding_completed: true,
      });
      try {
        const { writeDiscoveryLocation } = await import("@/lib/discovery-location");
        writeDiscoveryLocation({ lat, lng });
      } catch {
        /* */
      }
      toast.success("Profil tayyor!");
      void navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saqlashda xatolik");
    }
  };

  const onPrimary = () => {
    if (step === 1 && !nameValidation.ok) {
      setNameTouched(true);
      toast.error(NAME_ERROR_DEFAULTS[nameValidation.errorKey]);
      return;
    }
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
    nameError,
  };
}

export type OnboardingFlowState = ReturnType<typeof useOnboardingFlow>;
