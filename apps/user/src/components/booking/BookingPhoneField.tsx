import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatUzLocalPhone, parseUzLocalPhone, toUzE164Phone, uzPhoneToLocalDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (digits: string) => void;
  disabled?: boolean;
  className?: string;
};

export function BookingPhoneField({ value, onChange, disabled, className }: Props) {
  const { t } = useTranslation();
  const valid = value.length === 9;

  return (
    <section className={cn("space-y-2", className)}>
      <div>
        <label htmlFor="booking-phone" className="text-sm font-bold">
          {t("booking.phoneLabel", { defaultValue: "Telefon raqami" })}
          <span className="ml-1 text-xs font-medium text-destructive">*</span>
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("booking.phoneHint", {
            defaultValue: "Sartarosh va salon siz bilan bog'lanishi uchun kerak.",
          })}
        </p>
      </div>
      <div className="flex h-12 items-stretch overflow-hidden rounded-2xl border-2 border-border bg-surface transition-[border-color,box-shadow] focus-within:border-foreground focus-within:ring-4 focus-within:ring-foreground/10">
        <span className="flex shrink-0 items-center border-r border-border px-3.5 text-sm font-bold tabular-nums">
          +998
        </span>
        <input
          id="booking-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={formatUzLocalPhone(value)}
          disabled={disabled}
          onChange={(e) => onChange(parseUzLocalPhone(e.target.value))}
          placeholder="90-123-45-67"
          className="min-w-0 flex-1 border-0 bg-transparent px-4 text-sm font-bold leading-none placeholder:text-muted-foreground/45 focus:outline-none disabled:opacity-60"
        />
      </div>
      {!valid && value.length > 0 ? (
        <p className="text-xs text-destructive">
          {t("booking.phoneInvalid", { defaultValue: "9 xonali raqam kiriting." })}
        </p>
      ) : null}
    </section>
  );
}

export function useBookingPhoneGate(profilePhone: string | null | undefined) {
  const needsPhone = !profilePhone?.trim();
  const [phoneDigits, setPhoneDigits] = useState(() => uzPhoneToLocalDigits(profilePhone));
  const phoneValid = phoneDigits.length === 9;
  const e164Phone = phoneValid ? toUzE164Phone(phoneDigits) : "";

  return {
    needsPhone,
    phoneDigits,
    setPhoneDigits,
    phoneValid,
    e164Phone,
    customerPhonePayload: needsPhone && phoneValid ? e164Phone : undefined,
  };
}
