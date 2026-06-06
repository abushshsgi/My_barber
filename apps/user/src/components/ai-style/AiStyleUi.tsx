import { motion } from "framer-motion";
import { Camera, RefreshCw, Upload } from "lucide-react";
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
      accept="image/*"
      capture="user"
      hidden
      onChange={(e) => onFile(e.target.files?.[0])}
    />
  );
}

type UploadProps = {
  onOpen: () => void;
  compact?: boolean;
};

export function AiStyleUploadEmpty({ onOpen, compact }: UploadProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-surface active:scale-[0.99] transition-transform",
        compact ? "aspect-[4/3] px-4 py-6" : "aspect-[4/5]",
      )}
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-foreground text-background">
        <Camera className="h-7 w-7" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold">{t("aiStylePage.uploadTitle")}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{t("aiStylePage.uploadHint")}</p>
      </div>
      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-background px-3 py-1.5 text-[11px] font-bold">
        <Upload className="h-3 w-3" />
        {t("aiStylePage.pickFile")}
      </span>
    </button>
  );
}

type PhotoProps = {
  photo: string;
  analyzing: boolean;
  onReset: () => void;
  className?: string;
  imageClassName?: string;
  fullBleed?: boolean;
};

export function AiStylePhotoPreview({
  photo,
  analyzing,
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
      {analyzing ? <AiStyleScanLine fullBleed={fullBleed} /> : null}
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
