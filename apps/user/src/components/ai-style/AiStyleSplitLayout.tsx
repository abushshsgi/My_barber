import { Link } from "@tanstack/react-router";
import { Camera, ChevronLeft, ImagePlus, ScanFace } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { AiStyleResultsBlock } from "@/components/ai-style/AiStyleResults";
import { AiStyleAnalyzeCta, AiStyleScanLine } from "@/components/ai-style/AiStyleUi";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import { cn } from "@/lib/utils";

export type AiStyleSplitLayoutProps = {
  step: 1 | 2 | 3;
  photo: string | null;
  validating: boolean;
  analyzing: boolean;
  done: boolean;
  result: AiAnalysisResult | null;
  saved: string[];
  onToggleSave: (id: string) => void;
  onReset: () => void;
  openFile: () => void;
  openCamera: () => void;
  onAnalyze: () => void;
};

function StepRail({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const steps = [
    t("aiStylePage.steps.upload"),
    t("aiStylePage.steps.analyze"),
    t("aiStylePage.steps.results"),
  ];

  return (
    <div className="flex items-center gap-2">
      {steps.map((label, index) => {
        const n = (index + 1) as 1 | 2 | 3;
        const active = step >= n;
        const current = step === n;
        return (
          <div key={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div
              className={cn(
                "h-1 rounded-full transition-colors",
                active ? "bg-foreground" : "bg-border",
                current && "ring-2 ring-foreground/20 ring-offset-2 ring-offset-background",
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

function UploadActions({
  onOpenCamera,
  onOpenGallery,
  validating,
}: {
  onOpenCamera: () => void;
  onOpenGallery: () => void;
  validating?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border bg-background p-1">
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          disabled={validating}
          onClick={onOpenCamera}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 text-sm font-bold text-background disabled:opacity-60"
        >
          <Camera className="h-4 w-4" />
          {t("aiStylePage.openCamera")}
        </button>
        <button
          type="button"
          disabled={validating}
          onClick={onOpenGallery}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" />
          {t("aiStylePage.pickFromGallery")}
        </button>
      </div>
    </div>
  );
}

export function AiStyleSplitLayout(props: AiStyleSplitLayoutProps) {
  const { t } = useTranslation();
  const busy = props.analyzing || props.validating;

  return (
    <div className="flex min-h-full flex-col bg-foreground pb-[calc(68px+env(safe-area-inset-bottom))]">
      <div className="relative min-h-[42vh] shrink-0">
        {props.photo ? (
          <>
            <img src={props.photo} alt="" className="h-full min-h-[42vh] w-full object-cover" />
            {busy ? <AiStyleScanLine /> : null}
          </>
        ) : (
          <div className="flex h-full min-h-[42vh] flex-col items-center justify-center gap-3 px-6 text-background">
            <ScanFace className="h-12 w-12 text-background/80" />
            <p className="text-center text-sm font-bold">{t("aiStylePage.uploadTitle")}</p>
          </div>
        )}
        <Link
          to="/profile"
          className="absolute left-5 top-[calc(env(safe-area-inset-top)+12px)] grid h-10 w-10 place-items-center rounded-full bg-black/35 text-background backdrop-blur-md"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col rounded-t-[28px] bg-background px-5 pb-6 pt-5 text-foreground">
        <StepRail step={props.step} />
        <div className="mt-4">
          <AudienceSwitch showProfileHint={false} />
        </div>

        {!props.photo ? (
          <div className="mt-5 space-y-3">
            <UploadActions
              onOpenCamera={props.openCamera}
              onOpenGallery={props.openFile}
              validating={props.validating}
            />
            <p className="text-center text-[11px] text-muted-foreground">
              {t("aiStylePage.privacyNote")}
            </p>
          </div>
        ) : props.done && props.result ? (
          <div className="mt-5">
            <AiStyleResultsBlock
              result={props.result}
              saved={props.saved}
              onToggleSave={props.onToggleSave}
              onReset={props.onReset}
              layout="carousel"
            />
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-bold">{t("aiStylePage.photoReadyTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("aiStylePage.photoReadyDesc")}</p>
            <button
              type="button"
              onClick={props.onReset}
              className="rounded-full border border-border px-3 py-1.5 text-[10px] font-bold"
            >
              {t("aiStylePage.retake")}
            </button>
            <AiStyleAnalyzeCta
              analyzing={props.analyzing}
              validating={props.validating}
              onAnalyze={props.onAnalyze}
            />
          </div>
        )}
      </div>
    </div>
  );
}
