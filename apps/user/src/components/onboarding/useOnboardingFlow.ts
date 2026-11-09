import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { GeolocationError, getAccuratePosition } from "@/lib/native-geolocation";
import { useMe, useUpdateMe } from "@/hooks/use-me";
import { roundCoord } from "@/lib/api/list-utils";
import { getAuthUserId } from "@/lib/auth-user";
import { isProfileLocationRequired, userHasProfileCoords } from "@/lib/recommendations";
import {
  notifyAudienceReset,
  readScopedPrefsRaw,
  writeScopedAudience,
  writeScopedPrefsRaw,
} from "@/lib/user-prefs";
import {
  sanitizeDisplayNameInput,
  validateDisplayName,
  type DisplayNameErrorKey,
} from "@/lib/validate-display-name";

export const ONBOARDING_STEPS = ["Ism va yosh", "Jins"] as const;

export type ProfileGender = "male" | "female";

function rememberProfileAudience(gender: ProfileGender) {
  const audience = gender === "male" ? "men" : "women";
  const userId = getAuthUserId();
  if (userId == null) return;
  writeScopedAudience(userId, audience);
  let prefs: Record<string, unknown> = {};
  try {
    const raw = readScopedPrefsRaw(userId);
    if (raw) prefs = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    prefs = {};
  }
  writeScopedPrefsRaw(userId, JSON.stringify({ ...prefs, preferredAudience: audience }));
  notifyAudienceReset(userId);
}

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
  const { data: me } = useMe();
  const updateMe = useUpdateMe();
  const locationRequired = isProfileLocationRequired(me);
  const lastStep = locationRequired ? 3 : 2;
  const steps = locationRequired
    ? (["Ism va yosh", "Jins", "Joylashuv"] as const)
    : ONBOARDING_STEPS;

  const [step, setStep] = useState(1);
  const [firstName, setFirstNameRaw] = useState("");
  const [lastName, setLastNameRaw] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<ProfileGender | "">("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsAttempted, setGpsAttempted] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const hasBirth = me?.birth_year != null && Number(me.birth_year) > 1900;
  const hasGender = me?.gender === "male" || me?.gender === "female";
  const locationOnly =
    locationRequired &&
    me?.onboarding_completed === true &&
    hasBirth &&
    hasGender &&
    !userHasProfileCoords(me);

  useEffect(() => {
    if (!me || prefilled) return;
    const first = (me.first_name || "").trim();
    const last = (me.last_name || "").trim();
    if (first) setFirstNameRaw(sanitizeDisplayNameInput(first));
    if (last) setLastNameRaw(sanitizeDisplayNameInput(last));
    if (hasBirth) {
      setAge(String(new Date().getFullYear() - Number(me.birth_year)));
    }
    if (me.gender === "male" || me.gender === "female") setGender(me.gender);
    setPrefilled(true);
  }, [me, prefilled, hasBirth]);

  useEffect(() => {
    if (!prefilled) return;
    if (locationOnly) {
      setStep(3);
      return;
    }
    if (me?.onboarding_completed === true && hasBirth && !hasGender) setStep(2);
  }, [locationOnly, prefilled, me?.onboarding_completed, hasBirth, hasGender]);

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
    nameTouched && !nameValidation.ok ? NAME_ERROR_DEFAULTS[nameValidation.errorKey] : null;

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
    if (!locationRequired || step !== 3 || gpsAttempted) return;
    void detectLocation();
  }, [step, gpsAttempted, detectLocation, locationRequired]);

  const ageOk = parseInt(age, 10) >= 10 && parseInt(age, 10) <= 100;
  const genderOk = gender === "male" || gender === "female";
  const canNext =
    (step === 1 && nameValidation.ok && ageOk) ||
    (step === 2 && genderOk) ||
    (step === 3 && locationRequired && lat != null && lng != null && !locating);

  const finish = async () => {
    if (locationRequired && (lat == null || lng == null)) {
      toast.error("GPS orqali joylashuvni aniqlang");
      return;
    }

    if (locationOnly) {
      try {
        await updateMe.mutateAsync({
          latitude: roundCoord(lat!),
          longitude: roundCoord(lng!),
        });
        try {
          const { writeDiscoveryLocation } = await import("@/lib/discovery-location");
          writeDiscoveryLocation({ lat: lat!, lng: lng! });
        } catch {
          /* */
        }
        toast.success("Joylashuv saqlandi");
        void navigate({ to: "/", replace: true });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Saqlashda xatolik");
      }
      return;
    }

    const checked = validateDisplayName(`${firstName} ${lastName}`);
    if (!checked.ok) {
      setNameTouched(true);
      setStep(1);
      toast.error(NAME_ERROR_DEFAULTS[checked.errorKey]);
      return;
    }
    if (!genderOk) {
      setStep(2);
      toast.error("Jinsni tanlang");
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
        gender,
        onboarding_completed: true,
        ...(locationRequired && lat != null && lng != null
          ? { latitude: roundCoord(lat), longitude: roundCoord(lng) }
          : {}),
      });
      if (locationRequired && lat != null && lng != null) {
        try {
          const { writeDiscoveryLocation } = await import("@/lib/discovery-location");
          writeDiscoveryLocation({ lat, lng });
        } catch {
          /* */
        }
      }
      rememberProfileAudience(gender);
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
    if (step === 1 && !ageOk) {
      toast.error("Yoshni 10 dan 100 gacha kiriting");
      return;
    }
    if (step === 2 && !genderOk) {
      toast.error("Jinsni tanlang");
      return;
    }
    if (step < lastStep) {
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
    gender,
    setGender,
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
    lastStep,
    steps,
    locationRequired,
  };
}

export type OnboardingFlowState = ReturnType<typeof useOnboardingFlow>;
