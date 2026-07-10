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

  const isDesktop = variant === "desktop";
  const inputClass = fieldClass[variant];
  const sectionLabel = cn(
    "flex items-center gap-2 font-bold",
    isDesktop ? "text-[15px]" : "text-sm",
  );

  if (step === 1) {
    return (
      <div className={cn("space-y-4", isDesktop && "mx-auto w-full max-w-md space-y-5")}>
        <div className={sectionLabel}>
          <User className={isDesktop ? "h-[18px] w-[18px]" : "h-4 w-4"} />
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
      <div className={cn("space-y-4", isDesktop && "mx-auto w-full max-w-sm space-y-5")}>
        <div className={sectionLabel}>
          <Calendar className={isDesktop ? "h-[18px] w-[18px]" : "h-4 w-4"} />
          Yoshingiz
        </div>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={age}
          onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))}
          placeholder="Masalan: 25"
          className={cn(inputClass, isDesktop && "text-center text-2xl tracking-wide tabular-nums")}
        />
        <p
          className={cn(
            "text-muted-foreground",
            isDesktop ? "text-center text-sm leading-relaxed" : "text-xs",
          )}
        >
          Xizmatlar va tavsiyalar yoshga mos tanlanadi.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", isDesktop && "space-y-5")}>
      <div className={sectionLabel}>
        <MapPin className={isDesktop ? "h-[18px] w-[18px]" : "h-4 w-4"} />
        Joylashuv
      </div>

      <div className={cn(isDesktop && "grid grid-cols-[minmax(0,260px)_1fr] items-end gap-4")}>
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
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
        </div>

        {isDesktop ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void detectLocation()}
            className="flex h-[3.35rem] items-center justify-center gap-2 rounded-[1.35rem] border border-border/80 bg-background px-5 text-sm font-bold transition-colors hover:bg-muted/40 disabled:opacity-50"
          >
            <MapPin className="h-4 w-4" />
            {locating
              ? "Aniqlanmoqda…"
              : lat != null
                ? "Qayta aniqlash"
                : "GPS orqali aniqlash"}
          </button>
        ) : null}
      </div>

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
        showGpsButton={false}
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
        mapClassName={isDesktop ? "h-[380px] xl:h-[440px]" : undefined}
        className={isDesktop ? "[&>div]:rounded-[1.35rem]" : undefined}
      />

      {!isDesktop ? (
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
      ) : null}

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
        <p
          className={cn(
            "text-muted-foreground",
            isDesktop ? "text-sm" : "text-center text-[11px]",
          )}
        >
          Davom etish uchun GPS orqali joylashuv talab qilinadi. Xaritadan pinni ham siljitishingiz
          mumkin.
        </p>
      ) : null}
    </div>
  );
}
