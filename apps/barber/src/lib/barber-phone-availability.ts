import { useCallback, useRef, useState } from "react";
import { checkBarberAvailability } from "@/lib/auth-errors";
import { formatUzPhoneE164, validateUzPhoneField } from "@/lib/phone";

type Options = {
  /** Salon egasi: salon kontakt raqami barber profilida ham ishlatilishi mumkin. */
  alsoAllowDigits?: string[];
};

export function useBarberPhoneAvailability(opts?: Options) {
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const alsoAllowRef = useRef(opts?.alsoAllowDigits);
  alsoAllowRef.current = opts?.alsoAllowDigits;

  const verifyPhoneDigits = useCallback(async (digits: string): Promise<boolean> => {
    setPhoneError(null);
    if (!digits.trim()) {
      setPhoneError("Telefon raqami majburiy.");
      return false;
    }
    const formatErr = validateUzPhoneField(digits);
    if (formatErr) {
      setPhoneError(formatErr);
      return false;
    }

    setCheckingPhone(true);
    try {
      const alsoAllowPhones = (alsoAllowRef.current ?? [])
        .filter((d) => d.replace(/\D/g, "").length === 9)
        .map((d) => formatUzPhoneE164(d));
      const result = await checkBarberAvailability({
        phone: formatUzPhoneE164(digits),
        alsoAllowPhones,
      });
      setPhoneError(result.phoneError);
      return !result.phoneError;
    } catch {
      setPhoneError("Tekshiruv amalga oshmadi. Qayta urinib ko'ring.");
      return false;
    } finally {
      setCheckingPhone(false);
    }
  }, []);

  const handlePhoneBlur = useCallback(
    (digits: string) => {
      if (digits.length < 9) return;
      void verifyPhoneDigits(digits);
    },
    [verifyPhoneDigits],
  );

  const clearPhoneError = useCallback(() => setPhoneError(null), []);

  return { phoneError, checkingPhone, verifyPhoneDigits, handlePhoneBlur, clearPhoneError };
}
