import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AiStyleCamera } from "@/components/ai-style/AiStyleCamera";
import { AiStyleSplitLayout } from "@/components/ai-style/AiStyleSplitLayout";
import { AiStylePhotoInput } from "@/components/ai-style/AiStyleUi";
import type { AiAnalysisResult, AiSuggestion } from "@/components/ai-style/ai-style-shared";
import type { useAiStyleFlow } from "@/components/ai-style/useAiStyleFlow";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useHairstyle } from "@/hooks/use-hairstyles";
import { getHairstyleImageUrl } from "@/lib/hairstyles/catalog";
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
    reset,
  } = flow;
  const { personaId } = useExplorePersona();
  const { data: focusHairstyle } = useHairstyle(focusStyleId ?? "", personaId);
  const [saved, setSaved] = useState<string[]>([]);

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

  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (photo && faceHint?.source === "camera_scan") {
      toast.success(t("aiStylePage.faceProfileSaved"));
    }
  }, [photo, faceHint, t]);

  const step: 1 | 2 | 3 = !photo ? 1 : analyzing || validating ? 2 : done ? 3 : 2;

  const toggleSave = (id: string) => {
    setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <>
      <AiStyleSplitLayout
        audience={audience}
        step={step}
        photo={photo}
        validatingPreview={validatingPreview}
        validating={validating}
        analyzing={analyzing}
        done={done}
        result={displayResult}
        focusStyleId={focusStyleId}
        saved={saved}
        onToggleSave={toggleSave}
        onReset={reset}
        openFile={openFile}
        openCamera={openCamera}
        onAnalyze={() => void analyze(audience)}
        tryOnByStyle={flow.tryOnByStyle}
        tryOnLoadingId={flow.tryOnLoadingId}
        onGenerateTryOn={(styleId) => void generateTryOn(styleId)}
      />

      <AiStylePhotoInput fileRef={fileRef} onFile={onFile} />
      <AiStyleCamera open={cameraOpen} onClose={closeCamera} onCapture={onCameraCapture} />
    </>
  );
}
