import { Link } from "@tanstack/react-router";
import {
  Camera,
  ChevronLeft,
  ImagePlus,
  Loader2,
  RefreshCw,
  ScanFace,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { AiStylePageLayout } from "@/components/ai-style/AiStylePageLayout";
import { AiStyleResultsBlock } from "@/components/ai-style/AiStyleResults";
import {
  AiStyleAnalyzeCta,
  AiStyleMirrorFrame,
  AiStylePhotoPreview,
  AiStyleScanLine,
  AiStyleUploadEmpty,
} from "@/components/ai-style/AiStyleUi";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import { cn } from "@/lib/utils";

export type AiStyleLayoutProps = {
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
                current && "ring-2 ring-foreground/20 ring-offset-2 ring-offset-surface",
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
  layout,
}: {
  onOpenCamera: () => void;
  onOpenGallery: () => void;
  validating?: boolean;
  layout: "row" | "stack" | "grid";
}) {
  const { t } = useTranslation();

  if (layout === "grid") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={validating}
          onClick={onOpenCamera}
          className="flex min-h-[120px] flex-col justify-between rounded-2xl bg-foreground p-4 text-left text-background active:scale-[0.98] disabled:opacity-60"
        >
          <Camera className="h-5 w-5" />
          <span className="text-sm font-bold">{t("aiStylePage.openCamera")}</span>
        </button>
        <button
          type="button"
          disabled={validating}
          onClick={onOpenGallery}
          className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-border bg-background p-4 text-left active:scale-[0.98] disabled:opacity-60"
        >
          <ImagePlus className="h-5 w-5" />
          <span className="text-sm font-bold">{t("aiStylePage.pickFromGallery")}</span>
        </button>
      </div>
    );
  }

  if (layout === "stack") {
    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled={validating}
          onClick={onOpenCamera}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-background px-4 py-4 text-sm font-bold text-foreground active:scale-[0.98] disabled:opacity-60"
        >
          <Camera className="h-4 w-4" />
          {t("aiStylePage.openCamera")}
        </button>
        <button
          type="button"
          disabled={validating}
          onClick={onOpenGallery}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-background/25 px-4 py-4 text-sm font-bold text-background active:scale-[0.98] disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" />
          {t("aiStylePage.pickFromGallery")}
        </button>
      </div>
    );
  }

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

/** 1 — Studio Mirror (yengil krem, oyna ramka) */
export function MirrorVariant(props: AiStyleLayoutProps) {
  const showFooter = Boolean(props.photo && !props.done);

  return (
    <AiStylePageLayout
      step={props.step}
      footer={
        showFooter ? (
          <AiStyleAnalyzeCta
            analyzing={props.analyzing}
            validating={props.validating}
            onAnalyze={props.onAnalyze}
            compact
          />
        ) : undefined
      }
    >
      {!props.photo ? (
        <AiStyleUploadEmpty
          onOpenGallery={props.openFile}
          onOpenCamera={props.openCamera}
          validating={props.validating}
        />
      ) : (
        <AiStylePhotoPreview
          photo={props.photo}
          analyzing={props.analyzing}
          validating={props.validating}
          onReset={props.onReset}
        />
      )}
      {props.done && props.result ? (
        <div className="mt-6 pb-4">
          <AiStyleResultsBlock
            result={props.result}
            saved={props.saved}
            onToggleSave={props.onToggleSave}
            onReset={props.onReset}
            layout="carousel"
          />
        </div>
      ) : null}
    </AiStylePageLayout>
  );
}

/** 2 — Immersive (qora hero, to‘liq ekran hissi) */
export function ImmersiveVariant(props: AiStyleLayoutProps) {
  const { t } = useTranslation();
  const busy = props.analyzing || props.validating;

  return (
    <div className="min-h-full bg-foreground pb-[calc(68px+env(safe-area-inset-bottom))] text-background">
      <div className="px-5 pb-6 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="grid h-10 w-10 place-items-center rounded-full border border-background/20 bg-background/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{t("aiStylePage.title")}</h1>
            <p className="text-xs text-background/65">{t("aiStylePage.subtitle")}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-background/10 p-2">
          <div className="rounded-xl bg-background p-1">
            <AudienceSwitch showProfileHint={false} />
          </div>
        </div>
      </div>

      <div className="rounded-t-[32px] bg-background px-5 pb-6 pt-6 text-foreground">
        {!props.photo ? (
          <div className="space-y-4">
            <div className="rounded-[28px] bg-foreground p-6 text-background">
              <ScanFace className="h-10 w-10" />
              <p className="mt-4 text-lg font-bold">{t("aiStylePage.uploadTitle")}</p>
              <p className="mt-1 text-sm text-background/70">{t("aiStylePage.uploadHint")}</p>
            </div>
            <UploadActions
              onOpenCamera={props.openCamera}
              onOpenGallery={props.openFile}
              validating={props.validating}
              layout="grid"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-[28px]">
              <img src={props.photo} alt="" className="aspect-[4/5] w-full object-cover" />
              {busy ? <AiStyleScanLine /> : null}
              <button
                type="button"
                onClick={props.onReset}
                className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-background/90 text-foreground"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            {!props.done ? (
              <AiStyleAnalyzeCta
                analyzing={props.analyzing}
                validating={props.validating}
                onAnalyze={props.onAnalyze}
              />
            ) : null}
          </div>
        )}

        {props.done && props.result ? (
          <div className="mt-6">
            <AiStyleResultsBlock
              result={props.result}
              saved={props.saved}
              onToggleSave={props.onToggleSave}
              onReset={props.onReset}
              layout="stack"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** 3 — Wizard (har bosqich alohida karta) */
export function WizardVariant(props: AiStyleLayoutProps) {
  const { t } = useTranslation();
  const busy = props.analyzing || props.validating;
  const phaseLabel = props.done
    ? t("aiStylePage.steps.results")
    : !props.photo
      ? t("aiStylePage.steps.upload")
      : busy
        ? t("aiStylePage.steps.analyze")
        : t("aiStylePage.steps.analyze");

  return (
    <div className="min-h-full bg-surface px-5 pb-[calc(68px+env(safe-area-inset-bottom)+16px)] pt-[calc(env(safe-area-inset-top)+12px)]">
      <Link
        to="/profile"
        className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>

      <div className="mt-6 flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-foreground text-xl font-bold text-background">
          {props.step}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("aiStylePage.variantWizardStep")}
          </p>
          <h1 className="text-2xl font-bold">{phaseLabel}</h1>
        </div>
      </div>

      <div className="mt-4">
        <AudienceSwitch showProfileHint={false} />
      </div>

      <div className="mt-6 rounded-[28px] border border-border bg-background p-5 shadow-sm">
        {!props.photo ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-surface">
              {props.validating ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <ScanFace className="h-8 w-8" />
              )}
            </div>
            <div>
              <p className="text-lg font-bold">{t("aiStylePage.uploadTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("aiStylePage.uploadHint")}</p>
            </div>
            <UploadActions
              onOpenCamera={props.openCamera}
              onOpenGallery={props.openFile}
              validating={props.validating}
              layout="row"
            />
          </div>
        ) : props.done && props.result ? (
          <AiStyleResultsBlock
            result={props.result}
            saved={props.saved}
            onToggleSave={props.onToggleSave}
            onReset={props.onReset}
            layout="stack"
          />
        ) : (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl">
              <img src={props.photo} alt="" className="aspect-square w-full object-cover" />
              {busy ? <AiStyleScanLine /> : null}
            </div>
            <button
              type="button"
              onClick={props.onReset}
              className="w-full rounded-xl border border-border py-2.5 text-xs font-bold"
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

/** 4 — Split (yuqori foto, pastki panel) */
export function SplitVariant(props: AiStyleLayoutProps) {
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
              layout="row"
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

/** 5 — Bento (karta grid, vertikal natijalar) */
export function BentoVariant(props: AiStyleLayoutProps) {
  const { t } = useTranslation();
  const busy = props.analyzing || props.validating;

  return (
    <div className="min-h-full bg-background px-5 pb-[calc(68px+env(safe-area-inset-bottom)+16px)] pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="flex items-center gap-3">
        <Link
          to="/profile"
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{t("aiStylePage.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("aiStylePage.introDesc")}</p>
        </div>
      </div>

      <div className="mt-4">
        <AudienceSwitch showProfileHint={false} />
      </div>

      {!props.photo ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={props.validating}
            onClick={props.openCamera}
            className="col-span-2 flex items-center gap-4 rounded-3xl bg-foreground p-5 text-left text-background active:scale-[0.98] disabled:opacity-60"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-background/15">
              <Camera className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-bold">{t("aiStylePage.openCamera")}</span>
              <span className="text-xs text-background/70">
                {t("aiStylePage.uploadFeatures.face")}
              </span>
            </span>
          </button>
          <button
            type="button"
            disabled={props.validating}
            onClick={props.openFile}
            className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-4 text-left active:scale-[0.98] disabled:opacity-60"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-xs font-bold">{t("aiStylePage.pickFromGallery")}</span>
          </button>
          <div className="flex flex-col justify-between rounded-3xl border border-dashed border-border bg-surface/50 p-4">
            <Sparkles className="h-5 w-5" />
            <p className="text-[11px] font-bold leading-snug">
              {t("aiStylePage.uploadFeatures.styles")}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <AiStyleMirrorFrame>
            <div className="relative aspect-[4/5]">
              <img src={props.photo} alt="" className="h-full w-full object-cover" />
              {busy ? <AiStyleScanLine /> : null}
            </div>
          </AiStyleMirrorFrame>
          {!props.done ? (
            <AiStyleAnalyzeCta
              analyzing={props.analyzing}
              validating={props.validating}
              onAnalyze={props.onAnalyze}
            />
          ) : null}
          <button
            type="button"
            onClick={props.onReset}
            className="w-full text-center text-xs font-bold text-muted-foreground"
          >
            {t("aiStylePage.retake")}
          </button>
        </div>
      )}

      {props.done && props.result ? (
        <div className="mt-6">
          <AiStyleResultsBlock
            result={props.result}
            saved={props.saved}
            onToggleSave={props.onToggleSave}
            onReset={props.onReset}
            layout="stack"
          />
        </div>
      ) : null}
    </div>
  );
}
