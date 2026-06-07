import { motion } from "framer-motion";
import { Camera, ImagePlus, Loader2, RefreshCw } from "lucide-react";
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

export function AiStyleUploadEmpty({ onOpenGallery, onOpenCamera, validating }: UploadProps) {
  const { t } = useTranslation();
  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-border bg-surface px-4 py-8">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-foreground text-background">
        {validating ? (
          <Loader2 className="h-7 w-7 animate-spin" />
        ) : (
          <Camera className="h-7 w-7" />
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-bold">{t("aiStylePage.uploadTitle")}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{t("aiStylePage.uploadHint")}</p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={validating}
          onClick={onOpenCamera}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground px-4 py-3 text-sm font-bold text-background disabled:opacity-60"
        >
          <Camera className="h-4 w-4" />
          {t("aiStylePage.openCamera")}
        </button>
        <button
          type="button"
          disabled={validating}
          onClick={onOpenGallery}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-background px-4 py-3 text-sm font-bold disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" />
          {t("aiStylePage.pickFromGallery")}
        </button>
      </div>
      {validating ? (
        <p className="text-[11px] font-medium text-muted-foreground">{t("aiStylePage.faceChecking")}</p>
      ) : null}
    </div>
  );
}

type PhotoProps = {
  photo: string;
  analyzing: boolean;
  validating?: boolean;
  onReset: () => void;
  className?: string;
  imageClassName?: string;
  fullBleed?: boolean;
};

export function AiStylePhotoPreview({
  photo,
  analyzing,
  validating,
  onReset,
  className,
  imageClassName,
  fullBleed,
}: PhotoProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        fullBleed ? "rounded-none" : "rounded-3xl",
        className,
      )}
    >
      <img
        src={photo}
        alt={t("aiStylePage.selfieAlt")}
        className={cn("w-full object-cover", imageClassName ?? "aspect-[4/5]")}
      />
      {analyzing || validating ? <AiStyleScanLine fullBleed={fullBleed} /> : null}
      <button
        type="button"
        onClick={onReset}
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-foreground/75 text-background backdrop-blur-md"
        aria-label={t("aiStylePage.resetPhoto")}
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AiStyleScanLine({ fullBleed }: { fullBleed?: boolean }) {
  return (
    <motion.div
      className={cn(
        "pointer-events-none absolute inset-x-0 h-0.5 bg-background/90 shadow-[0_0_12px_oklch(1_0_0/0.5)]",
        fullBleed ? "top-0" : "",
      )}
      animate={{ y: fullBleed ? [0, 520, 0] : [0, 400, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

type StepsProps = {
  step: 1 | 2 | 3;
};

export function AiStyleSteps({ step }: StepsProps) {
  const { t } = useTranslation();
  const steps = [
    t("aiStylePage.steps.upload"),
    t("aiStylePage.steps.analyze"),
    t("aiStylePage.steps.results"),
  ];

  return (
    <div className="mb-4 flex gap-2">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = step >= n;
        return (
          <div key={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div
              className={cn(
                "h-1 rounded-full transition-colors",
                active ? "bg-foreground" : "bg-border",
              )}
            />
            <p
              className={cn(
                "truncate text-[9px] font-bold uppercase tracking-wide",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
