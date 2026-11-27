import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type ProductShape = {
  image_url?: string | null;
  brand?: string;
  name?: string;
  title?: string;
  is_verified?: boolean;
  country_of_origin?: string | null;
  volume_ml?: number | null;
  barcode?: string | null;
};

type Props = {
  product?: ProductShape | null;
  fallbackName?: string;
  fallbackBrand?: string;
  barcode?: string;
  verified?: boolean;
  className?: string;
};

export function HairAdvisor2ProductHeader({
  product,
  fallbackName,
  fallbackBrand,
  barcode,
  verified,
  className,
}: Props) {
  const { t } = useTranslation();
  const name = product?.name || product?.title || fallbackName || t("hairAdvisor.productFallback");
  const brand = product?.brand || fallbackBrand || "";
  const img = product?.image_url;
  const isVerified = verified ?? Boolean(product?.is_verified);
  const country = product?.country_of_origin;
  const volume = product?.volume_ml;
  const code = product?.barcode || barcode || "—";

  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4", className)}>
      <div className="overflow-hidden rounded-[20px] bg-[#F7F7F8] ring-1 ring-[#E8E8EB]">
        <div className="flex aspect-square w-full items-center justify-center p-3">
          {img ? (
            <img src={img} alt={name} className="max-h-full max-w-full object-contain" loading="lazy" />
          ) : (
            <motionSvgPlug />
          )}
        </div>
      </div>
      <div className="min-w-0 space-y-2 pt-1">
        {brand ? <p className="text-[26px] font-semibold leading-tight tracking-tight text-[#111111]">{brand}</p> : null}
        <p className="text-[18px] font-medium leading-snug text-[#111111]">{name}</p>
        {isVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF7ED] px-2.5 py-1 text-xs font-semibold text-[#16803C]">
            <ShieldCheck className="size-3.5" aria-hidden />
            {t("hairAdvisor.badgeVerified")}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-[#F7F7F8] px-2.5 py-1 text-xs font-semibold text-[#71717A]">
            {t("hairAdvisor.badgeUnverified")}
          </span>
        )}
        <MetaRow
          label={t("hairAdvisor.metaCountry")}
          value={country?.trim() ? country : t("hairAdvisor.metaUnknown")}
        />
        {volume ? (
          <MetaRow label={t("hairAdvisor.metaVolume")} value={t("hairAdvisor.metaVolumeMl", { volume })} />
        ) : null}
        <MetaRow label={t("hairAdvisor.metaBarcode")} value={code} />
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[13px] leading-snug text-[#71717A]">
      <span className="text-[#111111]/80">{label}:</span> {value}
    </p>
  );
}

function motionSvgPlug() {
  return (
    <svg viewBox="0 0 64 96" className="h-24 w-16 text-[#C4C4C8]" aria-hidden>
      <rect x="18" y="8" width="28" height="10" rx="4" fill="currentColor" opacity="0.35" />
      <rect x="14" y="18" width="36" height="70" rx="10" fill="currentColor" opacity="0.2" />
    </svg>
  );
}