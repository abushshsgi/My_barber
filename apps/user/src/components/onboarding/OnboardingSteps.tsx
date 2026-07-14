import { Calendar, MapPin, User } from "lucide-react";
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
    "w-full rounded-[1.25rem] border border-border/80 bg-background px-5 py-3.5 text-[15px] font-semibold tracking-tight text-foreground placeholder:text-muted-foreground/55 focus:border-foreground focus:outline-none transition-colors",
} as const;

function GpsButton({
  isDesktop,
  busy,
  locating,
  hasLocation,
  onClick,
}: {
  isDesktop: boolean;
  busy: boolean;
  locating: boolean;
  hasLocation: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50",
        isDesktop
          ? "rounded-[1.25rem] border border-border/80 bg-background px-4 py-2.5 transition-colors hover:bg-muted/40"
          : "w-full rounded-2xl border-2 border-dashed border-foreground/40 py-3.5",
      )}
    >
      <MapPin className="h-4 w-4" />
      {locating
        ? "Aniqlanmoqda…"
        : hasLocation
          ? "Joylashuvni qayta aniqlash"
          : "GPS orqali aniqlash"}
    </button>
  );
}

export function OnboardingSteps({ state, variant = "mobile" }: Props) {
  const {
    step,
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
      <div className={cn("space-y-4", isDesktop && "mx-auto w-full max-w-md space-y-4")}>
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
      <div className={cn("space-y-4", isDesktop && "mx-auto w-full max-w-sm space-y-4")}>
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
    <div className={cn("space-y-3", isDesktop && "space-y-4")}>
      <div className={cn("flex items-center gap-3", isDesktop && "justify-between")}>
        <div className={sectionLabel}>
          <MapPin className={isDesktop ? "h-[18px] w-[18px]" : "h-4 w-4"} />
          Joylashuv
        </div>
        {isDesktop ? (
          <GpsButton
            isDesktop
            busy={busy}
            locating={locating}
            hasLocation={lat != null}
            onClick={() => void detectLocation()}
          />
        ) : null}
      </div>

      <UserAddressLocationPicker
        showGpsButton={false}
        requireRegion={false}
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
        mapClassName={isDesktop ? "h-[280px] xl:h-[320px]" : "h-56 sm:h-64"}
        className={isDesktop ? "[&>div]:rounded-[1.25rem]" : undefined}
      />

      {!isDesktop ? (
        <GpsButton
          isDesktop={false}
          busy={busy}
          locating={locating}
          hasLocation={lat != null}
          onClick={() => void detectLocation()}
        />
      ) : null}

      {lat == null || lng == null ? (
        <p
          className={cn(
            "text-muted-foreground",
            isDesktop ? "text-sm" : "text-center text-[11px]",
          )}
        >
          Davom etish uchun joylashuvni aniqlang yoki xaritadan pinni siljiting.
        </p>
      ) : null}
    </div>
  );
}
