import { Barcode, Camera, ImageIcon, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  message?: string | null;
  onRescan: () => void;
  onImageSearch: () => void;
  onManualCode: () => void;
  onGallery?: () => void;
};

export function HairAdvisor2NotFoundPanel({
  message,
  onRescan,
  onImageSearch,
  onManualCode,
  onGallery,
}: Props) {
  const { t } = useTranslation();
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-end bg-black/70 px-5 pb-[max(6rem,env(safe-area-inset-bottom))] pt-24 backdrop-blur-sm"
      role="alertdialog"
      aria-labelledby="ha-not-found-title"
    >
      <div className="w-full max-w-md rounded-[24px] bg-white p-6 text-[#111111] shadow-xl">
        <h2 id="ha-not-found-title" className="text-xl font-bold">
          {t("scanner.productNotFoundTitle")}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#52525B]">
          {message?.trim() || t("scanner.productNotFoundBody")}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Action icon={Camera} label={t("scanner.captureProduct")} onClick={onImageSearch} primary />
          {onGallery ? <Action icon={ImageIcon} label={t("scanner.gallery")} onClick={onGallery} /> : null}
          <Action icon={Barcode} label={t("scanner.enterCode")} onClick={onManualCode} />
          <Action icon={RotateCcw} label={t("scanner.rescan")} onClick={onRescan} />
        </div>
      </div>
    </div>
  );
}

function Action({
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  icon: typeof RotateCcw;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111111] py-3.5 text-[15px] font-semibold text-white"
          : "flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E4E4E7] py-3.5 text-[15px] font-semibold text-[#111111]"
      }
    >
      <Icon className="size-5 shrink-0" />
      {label}
    </button>
  );
}
