import { motion } from "framer-motion";
import { Camera, ImagePlus, Loader2, RefreshCw, ScanFace, Sparkles } from "lucide-react";
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

export function AiStyleMirrorFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[340px] overflow-hidden rounded-[32px] border border-border bg-background shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),0_20px_50px_-30px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-3 rounded-[26px] border border-foreground/8" />
      {children}
    </div>
  );
}

export function AiStyleUploadEmpty({ onOpenGallery, onOpenCamera, validating }: UploadProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col">
      <AiStyleMirrorFrame className="aspect-[3/4]">
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-surface">
            {validating ? (
              <Loader2 className="h-9 w-9 animate-spin text-foreground" />
            ) : (
              <ScanFace className="h-9 w-9 text-foreground/80" />
            )}
          </div>
          <div>
            <p className="text-lg font-bold">{t("aiStylePage.uploadTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("aiStylePage.uploadHint")}
            </p>
          </div>
        </div>
      </AiStyleMirrorFrame>

      <div className="mt-5 rounded-2xl border border-border bg-background p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            disabled={validating}
            onClick={onOpenCamera}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 text-sm font-bold text-background active:scale-[0.98] disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />
            {t("aiStylePage.openCamera")}
          </button>
          <button
            type="button"
            disabled={validating}
            onClick={onOpenGallery}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold active:scale-[0.98] disabled:opacity-60"
          >
            <ImagePlus className="h-4 w-4" />
            {t("aiStylePage.pickFromGallery")}
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
        {validating ? t("aiStylePage.faceChecking") : t("aiStylePage.privacyNote")}
      </p>
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
    <div className="flex flex-1 flex-col">
      <AiStyleMirrorFrame>
        <div className="relative aspect-[3/4]">
          <img
            src={photo}
            alt={t("aiStylePage.selfieAlt")}
            className="h-full w-full object-cover"
          />
          {busy ? <AiStyleScanLine /> : null}
        </div>
      </AiStyleMirrorFrame>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">{t("aiStylePage.photoReadyTitle")}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t("aiStylePage.photoReadyDesc")}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-2 text-[11px] font-bold active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("aiStylePage.retake")}
        </button>
      </div>

      {busy ? (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {validating ? t("aiStylePage.faceChecking") : t("aiStylePage.analyzing")}
        </div>
      ) : null}
    </div>
  );
}

export function AiStyleScanLine() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-x-6 h-px bg-foreground/80 shadow-[0_0_10px_rgba(0,0,0,0.25)]"
      animate={{ y: [32, 420, 32] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

type AnalyzeCtaProps = {
  analyzing: boolean;
  validating?: boolean;
  onAnalyze: () => void;
  compact?: boolean;
};

export function AiStyleAnalyzeCta({ analyzing, validating, onAnalyze, compact }: AnalyzeCtaProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onAnalyze}
      disabled={analyzing || validating}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground font-bold text-background active:scale-[0.98] disabled:opacity-60",
        compact ? "px-4 py-3.5 text-sm" : "px-5 py-4 text-sm",
      )}
    >
      {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {analyzing ? t("aiStylePage.analyzing") : t("aiStylePage.analyzeCta")}
    </button>
  );
}
