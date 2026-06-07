import { motion } from "framer-motion";
import {
  Camera,
  ImagePlus,
  Loader2,
  RefreshCw,
  ScanFace,
  Scissors,
  Sparkles,
  Store,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type PhotoInputProps = {
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | null | undefined) => void;
};

export function AiStylePhotoInput({ fileRef, onFile }: PhotoInputProps) {
  return (
    <input
      ref={fileRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      hidden
      onChange={(e) => onFile(e.target.files?.[0])}
    />
  );
}

type UploadProps = {
  onOpenGallery: () => void;
  onOpenCamera: () => void;
  validating?: boolean;
};

const FEATURES = [
  { key: "face", icon: ScanFace },
  { key: "styles", icon: Scissors },
  { key: "book", icon: Store },
] as const;

export function AiStyleUploadEmpty({ onOpenGallery, onOpenCamera, validating }: UploadProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[26px] border border-border bg-surface/50 p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.04),transparent_55%)]" />
        <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
          <div className="absolute inset-0 rounded-[32px] border-2 border-dashed border-foreground/15" />
          <div className="absolute inset-3 rounded-[26px] border border-foreground/10" />
          <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-foreground text-background shadow-lg">
            {validating ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <ScanFace className="h-7 w-7" />
            )}
          </div>
        </div>
        <div className="relative mt-5 text-center">
          <p className="text-base font-bold">{t("aiStylePage.uploadTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("aiStylePage.uploadHint")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={validating}
          onClick={onOpenCamera}
          className="group flex min-h-[132px] flex-col justify-between rounded-[22px] bg-foreground p-4 text-left text-background active:scale-[0.98] disabled:opacity-60"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-background/15">
            <Camera className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold">{t("aiStylePage.openCamera")}</span>
            <span className="mt-1 block text-[11px] text-background/65">
              {t("aiStylePage.uploadFeatures.face")}
            </span>
          </span>
        </button>

        <button
          type="button"
          disabled={validating}
          onClick={onOpenGallery}
          className="group flex min-h-[132px] flex-col justify-between rounded-[22px] border-2 border-border bg-background p-4 text-left active:scale-[0.98] disabled:opacity-60"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface">
            <ImagePlus className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold">{t("aiStylePage.pickFromGallery")}</span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {t("aiStylePage.uploadFeatures.gallery")}
            </span>
          </span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {FEATURES.map(({ key, icon: Icon }) => (
          <div
            key={key}
            className="rounded-2xl border border-border bg-surface/40 px-2 py-3 text-center"
          >
            <Icon className="mx-auto h-4 w-4 text-foreground/70" />
            <p className="mt-2 text-[10px] font-bold leading-tight">
              {t(`aiStylePage.uploadFeatures.${key}`)}
            </p>
          </div>
        ))}
      </div>

      {validating ? (
        <p className="text-center text-xs font-medium text-muted-foreground">
          {t("aiStylePage.faceChecking")}
        </p>
      ) : (
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          {t("aiStylePage.privacyNote")}
        </p>
      )}
    </div>
  );
}

type PhotoProps = {
  photo: string;
  analyzing: boolean;
  validating?: boolean;
  onReset: () => void;
};

export function AiStylePhotoPreview({ photo, analyzing, validating, onReset }: PhotoProps) {
  const { t } = useTranslation();
  const busy = analyzing || validating;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[26px] border border-border shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]">
        <img
          src={photo}
          alt={t("aiStylePage.selfieAlt")}
          className="aspect-[4/5] w-full object-cover"
        />
        {busy ? <AiStyleScanLine /> : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
        <button
          type="button"
          onClick={onReset}
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur-md active:scale-95"
          aria-label={t("aiStylePage.resetPhoto")}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-sm font-bold text-white">{t("aiStylePage.photoReadyTitle")}</p>
          <p className="mt-0.5 text-[11px] text-white/75">{t("aiStylePage.photoReadyDesc")}</p>
        </div>
      </div>

      {busy ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface/50 px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-xs font-bold">
            {validating ? t("aiStylePage.faceChecking") : t("aiStylePage.analyzing")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function AiStyleScanLine() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-x-4 h-0.5 rounded-full bg-white/90 shadow-[0_0_16px_rgba(255,255,255,0.55)]"
      animate={{ y: [24, 360, 24] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

type AnalyzeCtaProps = {
  analyzing: boolean;
  validating?: boolean;
  onAnalyze: () => void;
};

export function AiStyleAnalyzeCta({ analyzing, validating, onAnalyze }: AnalyzeCtaProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onAnalyze}
      disabled={analyzing || validating}
      className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-foreground px-5 py-4 text-sm font-bold text-background shadow-[0_12px_28px_-14px_rgba(0,0,0,0.55)] active:scale-[0.98] disabled:opacity-60"
    >
      {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {analyzing ? t("aiStylePage.analyzing") : t("aiStylePage.analyzeCta")}
    </button>
  );
}
