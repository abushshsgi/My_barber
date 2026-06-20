import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ApiUserAddress, UserAddressPayload } from "@/lib/api/addresses";
import { validateLocation, type LocationValidation } from "@/lib/api/geo";
import { roundCoord } from "@/lib/api/list-utils";
import { useRegions } from "@/hooks/use-regions";
import { CoverageWaitlistCard } from "@/components/coverage/CoverageWaitlistCard";
import { UserAddressLocationPicker } from "./UserAddressLocationPicker";
import { cn } from "@/lib/utils";

export type AddressFormValues = {
  label: ApiUserAddress["label"];
  custom_label: string;
  address_line: string;
  region: string;
  latitude: string;
  longitude: string;
  is_default: boolean;
};

type Props = {
  initial?: Partial<AddressFormValues>;
  submitLabel?: string;
  busy?: boolean;
  onSubmit: (payload: UserAddressPayload) => Promise<void>;
  onCancel?: () => void;
};

const LABELS: ApiUserAddress["label"][] = ["home", "work", "other"];

export function emptyAddressForm(region = ""): AddressFormValues {
  return {
    label: "home",
    custom_label: "",
    address_line: "",
    region,
    latitude: "",
    longitude: "",
    is_default: true,
  };
}

export function addressToForm(addr: ApiUserAddress): AddressFormValues {
  return {
    label: addr.label,
    custom_label: addr.custom_label || "",
    address_line: addr.address_line,
    region: addr.region,
    latitude: addr.latitude != null ? String(addr.latitude) : "",
    longitude: addr.longitude != null ? String(addr.longitude) : "",
    is_default: addr.is_default,
  };
}

export function AddressForm({ initial, submitLabel, busy, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const { data: regions = [], isLoading: regionsLoading } = useRegions();
  const [form, setForm] = useState<AddressFormValues>(() => ({
    ...emptyAddressForm(),
    ...initial,
  }));
  const [validation, setValidation] = useState<LocationValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [interestSubmitted, setInterestSubmitted] = useState(false);

  useEffect(() => {
    setForm({ ...emptyAddressForm(), ...initial });
  }, [initial]);

  const regionLabel = useMemo(
    () => regions.find((r) => r.value === form.region)?.label ?? "",
    [regions, form.region],
  );

  const lat = form.latitude.trim() ? parseFloat(form.latitude) : null;
  const lng = form.longitude.trim() ? parseFloat(form.longitude) : null;
  const hasGps = lat != null && lng != null;
  const regionMismatch =
    hasGps && validation?.matches_selected === false && form.region.length > 0;
  const noCoverage =
    hasGps && form.region.length > 0 && validation?.has_coverage === false;

  useEffect(() => {
    if (!hasGps || !form.region) {
      setValidation(null);
      return;
    }
    setValidating(true);
    const timer = window.setTimeout(() => {
      void validateLocation(lat!, lng!, form.region)
        .then(setValidation)
        .catch(() => setValidation(null))
        .finally(() => setValidating(false));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [hasGps, lat, lng, form.region]);

  const canSave =
    form.address_line.trim().length >= 3 &&
    form.region.length > 0 &&
    hasGps &&
    !regionMismatch &&
    !validating &&
    (!noCoverage || interestSubmitted);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) {
      if (regionMismatch) {
        toast.error(t("geo.regionMismatch"));
        return;
      }
      if (!hasGps) {
        toast.error(t("onboarding.gpsRequired"));
        return;
      }
      toast.error(t("addresses.validation"));
      return;
    }
    if (hasGps) {
      const v = await validateLocation(lat!, lng!, form.region);
      if (v.matches_selected === false) {
        toast.error(t("geo.regionMismatch"));
        return;
      }
    }
    const payload: UserAddressPayload = {
      label: form.label,
      custom_label: form.label === "other" ? form.custom_label.trim() : "",
      address_line: form.address_line.trim(),
      region: form.region,
      is_default: form.is_default,
      latitude: roundCoord(lat!),
      longitude: roundCoord(lng!),
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("addresses.labelType", { defaultValue: "Manzil turi" })}
        </p>
        <div className="flex flex-wrap gap-2">
          {LABELS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setForm((f) => ({ ...f, label: key }))}
              className={cn(
                "rounded-full px-3.5 py-2 text-xs font-bold",
                form.label === key ? "bg-foreground text-background" : "bg-surface text-foreground",
              )}
            >
              {t(`addresses.labels.${key}`, {
                defaultValue: key === "home" ? "Uy" : key === "work" ? "Ofis" : "Boshqa",
              })}
            </button>
          ))}
        </div>
      </div>

      {form.label === "other" ? (
        <input
          value={form.custom_label}
          onChange={(e) => setForm((f) => ({ ...f, custom_label: e.target.value }))}
          placeholder={t("addresses.customLabel", { defaultValue: "Nom (masalan: Do'stim uyi)" })}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold focus:border-foreground focus:outline-none"
        />
      ) : null}

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("addresses.city", { defaultValue: "Shahar / viloyat" })}
        </label>
        <select
          value={form.region}
          onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
          disabled={regionsLoading}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold focus:border-foreground focus:outline-none"
        >
          <option value="">{t("addresses.selectCity", { defaultValue: "Tanlang…" })}</option>
          {regions.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {regionMismatch ? (
          <p className="mt-2 text-xs font-semibold text-destructive">{t("geo.regionMismatch")}</p>
        ) : validation?.region_from_gps_label && form.region && validation.matches_selected ? (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            GPS: {validation.city_label || validation.region_from_gps_label}
          </p>
        ) : (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {t("addresses.cityHint", {
              defaultValue: "Shahar o'zgarganda yaqin salonlar va tavsiyalar yangilanadi",
            })}
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("addresses.line", { defaultValue: "Manzil" })}
        </label>
        <textarea
          value={form.address_line}
          onChange={(e) => setForm((f) => ({ ...f, address_line: e.target.value }))}
          rows={2}
          placeholder={t("addresses.linePlaceholder", {
            defaultValue: "Ko'cha, uy, mo'ljal…",
          })}
          className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold focus:border-foreground focus:outline-none"
        />
      </div>

      <UserAddressLocationPicker
        region={form.region}
        regionLabel={regionLabel}
        address={form.address_line}
        latitude={form.latitude}
        longitude={form.longitude}
        setLatitude={(v) => setForm((f) => ({ ...f, latitude: v }))}
        setLongitude={(v) => setForm((f) => ({ ...f, longitude: v }))}
        setAddress={(v) => setForm((f) => ({ ...f, address_line: v }))}
        onRegionSuggestion={(code) => {
          if (!form.region) setForm((f) => ({ ...f, region: code }));
        }}
      />

      {noCoverage && !interestSubmitted ? (
        <CoverageWaitlistCard
          region={form.region}
          lat={lat}
          lng={lng}
          cityLabel={validation?.city_label}
          source="address"
          onSubmitted={() => setInterestSubmitted(true)}
        />
      ) : null}

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={form.is_default}
          onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
          className="h-4 w-4 rounded border-border"
        />
        {t("addresses.makeDefault", { defaultValue: "Asosiy manzil sifatida ishlatish" })}
      </label>

      <div className="flex gap-2 pt-1">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-border py-3 text-sm font-bold"
          >
            {t("common.cancel", { defaultValue: "Bekor" })}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={!canSave || busy}
          className="flex-1 rounded-2xl bg-foreground py-3 text-sm font-bold text-background disabled:opacity-50"
        >
          {submitLabel ?? t("common.save", { defaultValue: "Saqlash" })}
        </button>
      </div>
    </form>
  );
}
