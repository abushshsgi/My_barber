import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
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
};

export function AiStyleAnalyzeCta({ analyzing, validating, onAnalyze }: AnalyzeCtaProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onAnalyze}
      disabled={analyzing || validating}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-4 text-sm font-bold text-background active:scale-[0.98] disabled:opacity-60",
      )}
    >
      {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {analyzing ? t("aiStylePage.analyzing") : t("aiStylePage.analyzeCta")}
    </button>
  );
}
