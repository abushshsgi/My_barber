import { Calendar, MapPin, User } from "lucide-react";
import { CoverageWaitlistCard } from "@/components/coverage/CoverageWaitlistCard";
import { UserAddressLocationPicker } from "@/components/address/UserAddressLocationPicker";
import { cn } from "@/lib/utils";
import type { OnboardingFlowState } from "./useOnboardingFlow";

type Variant = "mobile" | "desktop";

type Props = {
  state: OnboardingFlowState;
  variant?: Variant;
};

const fieldClass = {
  mobile:
    "w-full rounded-2xl border-2 border-border bg-background px-4 py-3.5 text-sm font-bold focus:border-foreground focus:outline-none",
  desktop:
    "w-full rounded-[1.35rem] border border-border/80 bg-background px-5 py-4 text-[15px] font-semibold tracking-tight text-foreground placeholder:text-muted-foreground/55 focus:border-foreground focus:outline-none transition-colors",
} as const;

export function OnboardingSteps({ state, variant = "mobile" }: Props) {
  const {
    step,
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
    interestSubmitted,
    setInterestSubmitted,
    regions,
    regionsLoading,
    regionLabel,
    regionMismatch,
    noCoverage,
    detectLocation,
    busy,
  } = state;

  const inputClass = fieldClass[variant];
  const sectionLabel = cn(
    "flex items-center gap-2 font-bold",
    variant === "desktop" ? "text-[15px]" : "text-sm",
  );

  if (step === 1) {
    return (
      <div className={cn("space-y-4", variant === "desktop" && "space-y-5")}>
        <div className={sectionLabel}>
          <User className={variant === "desktop" ? "h-[18px] w-[18px]" : "h-4 w-4"} />
          Ism va familiya
        </div>
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Ism"
          autoComplete="given-name"
          className={inputClass}
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Familiya"
          autoComplete="family-name"
          className={inputClass}
        />
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className={cn("space-y-4", variant === "desktop" && "space-y-5")}>
        <div className={sectionLabel}>
          <Calendar className={variant === "desktop" ? "h-[18px] w-[18px]" : "h-4 w-4"} />
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
          className={inputClass}
        />
        <p className={cn("text-muted-foreground", variant === "desktop" ? "text-sm" : "text-xs")}>
          Xizmatlar va tavsiyalar yoshga mos tanlanadi.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", variant === "desktop" && "space-y-5")}>
      <div className={sectionLabel}>
        <MapPin className={variant === "desktop" ? "h-[18px] w-[18px]" : "h-4 w-4"} />
        Joylashuv
      </div>
      <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Viloyat
      </label>
      <select
        value={region}
        disabled={regionsLoading || locating}
        onChange={(e) => setRegion(e.target.value)}
        className={inputClass}
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
        className={cn(
          "flex w-full items-center justify-center gap-2 border-2 border-dashed border-foreground/40 text-sm font-bold",
          variant === "desktop"
            ? "rounded-[1.35rem] py-4 transition-colors hover:bg-muted/40"
            : "rounded-2xl py-3.5",
        )}
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
  );
}
