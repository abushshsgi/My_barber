import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AiStyleCamera } from "@/components/ai-style/AiStyleCamera";
import { AiStyleDesktopLayout } from "@/components/ai-style/AiStyleDesktopLayout";
import { AiStyleSplitLayout } from "@/components/ai-style/AiStyleSplitLayout";
import { AiStylePhotoInput } from "@/components/ai-style/AiStyleUi";
import { MorphAiHome } from "@/components/ai-style/MorphAiHome";
import { MorphAiIntroOverlay } from "@/components/ai-style/MorphAiIntroOverlay";
import type { AiAnalysisResult, AiSuggestion } from "@/components/ai-style/ai-style-shared";
import type { useAiStyleFlow } from "@/components/ai-style/useAiStyleFlow";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useHairstyle } from "@/hooks/use-hairstyles";
import { getHairstyleImageUrl } from "@/lib/hairstyles/catalog";
import {
  hasMorphAiIntroSeen,
  hasMorphAiOnboarded,
  markMorphAiIntroSeen,
  markMorphAiOnboarded,
} from "@/lib/morph-ai-session";
import {
  loadSavedAiStyleIds,
  removeSavedAiStyle,
  saveAiStyle,
} from "@/lib/saved-ai-styles";
import type { Audience } from "@/lib/mock-data";

type Flow = ReturnType<typeof useAiStyleFlow>;

type Props = {
  flow: Flow;
  audience: Audience;
  focusStyleId?: string;
};

function mergeFocusSuggestion(
  result: AiAnalysisResult,
  focusStyleId: string,
  title: string,
  imageUrl: string,
  reason?: string,
): AiAnalysisResult {
  if (result.suggestions.some((s) => s.id === focusStyleId)) {
    return result;
  }
  const focusSuggestion: AiSuggestion = {
    id: focusStyleId,
    title,
    match: 100,
    seed: focusStyleId,
    imageUrl,
    reason,
    barberName: "—",
    salonId: "",
    salonName: "—",
  };
  return {
    ...result,
    suggestions: [focusSuggestion, ...result.suggestions.filter((s) => s.id !== focusStyleId)],
  };
}

export function AiStyleFlow({ flow, audience, focusStyleId }: Props) {
  const { t } = useTranslation();
  const {
    photo,
    validatingPreview,
    validating,
    analyzing,
    done,
    result,
    error,
    cameraOpen,
    faceHint,
    fileRef,
    onFile,
    onCameraCapture,
    openFile,
    openCamera,
    closeCamera,
    analyze,
    generateTryOn,
    updateTryOnPreview,
    reset,
  } = flow;
  const { personaId } = useExplorePersona();
  const { data: focusHairstyle } = useHairstyle(focusStyleId ?? "", personaId);
  const [saved, setSaved] = useState<string[]>(() => loadSavedAiStyleIds());
  const [onboarded, setOnboarded] = useState(() => hasMorphAiOnboarded());
  const [showCapture, setShowCapture] = useState(() => !hasMorphAiOnboarded());
  const [showIntro, setShowIntro] = useState(() => !hasMorphAiIntroSeen());

  const handleIntroComplete = useCallback(() => {
    markMorphAiIntroSeen();
    setShowIntro(false);
  }, []);

  const displayResult = useMemo(() => {
    if (!result || !focusStyleId || !focusHairstyle) return result;
    return mergeFocusSuggestion(
      result,
      focusStyleId,
      focusHairstyle.titleUz,
      getHairstyleImageUrl(focusHairstyle),
      focusHairstyle.descriptionUz,
    );
  }, [result, focusStyleId, focusHairstyle]);

  const goHome = useCallback(() => {
    reset();
    setShowCapture(false);
  }, [reset]);

  const startNewLook = useCallback(() => {
    reset();
    setShowCapture(true);
  }, [reset]);

  const step: 1 | 2 | 3 = !photo ? 1 : analyzing || validating ? 2 : done ? 3 : 2;
  const showHome = onboarded && !showCapture && !photo && !done;

  useEffect(() => {
    if (showHome) {
      document.documentElement.removeAttribute("data-ai-style-flow");
      return;
    }
    document.documentElement.setAttribute("data-ai-style-flow", "open");
    return () => document.documentElement.removeAttribute("data-ai-style-flow");
  }, [showHome]);

  useEffect(() => {
    if (showHome) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [showHome]);

  const lastErrorToastRef = useRef<string | null>(null);
  useEffect(() => {
    if (!error) {
      lastErrorToastRef.current = null;
      return;
    }
    // Bir xil xabarni (masalan limit) qayta-qayta toast qilmaslik.
    if (lastErrorToastRef.current === error) return;
    lastErrorToastRef.current = error;
    toast.error(error);
  }, [error]);

  useEffect(() => {
    if (photo && faceHint?.source === "camera_scan") {
      toast.success(t("aiStylePage.faceProfileSaved"));
    }
  }, [photo, faceHint, t]);

  useEffect(() => {
    if (done) {
      setSaved(loadSavedAiStyleIds());
      markMorphAiOnboarded();
      setOnboarded(true);
    }
  }, [done]);

  useEffect(() => {
    if (photo) setShowCapture(true);
  }, [photo]);

  const toggleSave = useCallback(
    (id: string, meta?: { title: string; previewImage?: string }) => {
      const previewImage = meta?.previewImage ?? flow.tryOnByStyle[id];
      const title = meta?.title;

      if (saved.includes(id)) {
        removeSavedAiStyle(id);
        setSaved((prev) => prev.filter((x) => x !== id));
        toast.message(t("aiStylePage.unsaved"));
        return;
      }

      if (previewImage && title) {
        saveAiStyle({
          styleId: id,
          title,
          previewImage,
          savedAt: new Date().toISOString(),
        });
      }
      setSaved((prev) => (prev.includes(id) ? prev : [...prev, id]));
      toast.success(t("aiStylePage.savedToast"));
    },
    [saved, flow.tryOnByStyle, t],
  );

  const layoutProps = {
    audience,
    step,
    photo,
    validatingPreview,
    validating,
    analyzing,
    done,
    result: displayResult,
    focusStyleId,
    saved,
    onToggleSave: toggleSave,
    onReset: startNewLook,
    onGoHome: onboarded ? goHome : undefined,
    openFile,
    openCamera,
    onAnalyze: () => void analyze(audience),
    menPersonaId: personaId,
    tryOnByStyle: flow.tryOnByStyle,
    tryOnLoadingId: flow.tryOnLoadingId,
    onGenerateTryOn: (styleId: string, nextPersonaId?: Parameters<typeof generateTryOn>[1], title?: string) =>
      void generateTryOn(styleId, nextPersonaId, title),
    onUpdateTryOnPreview: updateTryOnPreview,
  };

  return (
    <>
      {showHome ? (
        <div className="h-full min-h-0">
          <MorphAiHome
            audience={audience}
            onStartNew={startNewLook}
            onOpenCamera={openCamera}
            onOpenGallery={openFile}
          />
        </div>
      ) : (
        <DesktopPageSplit
          mobile={<AiStyleSplitLayout {...layoutProps} />}
          desktop={<AiStyleDesktopLayout {...layoutProps} />}
        />
      )}

      <AiStylePhotoInput fileRef={fileRef} onFile={onFile} />
      <AiStyleCamera open={cameraOpen} onClose={closeCamera} onCapture={onCameraCapture} />
      <MorphAiIntroOverlay open={showIntro} onComplete={handleIntroComplete} />
    </>
  );
}
