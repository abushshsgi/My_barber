import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AiStyleCamera } from "@/components/ai-style/AiStyleCamera";
import { AiStyleSplitLayout } from "@/components/ai-style/AiStyleSplitLayout";
import { AiStylePhotoInput } from "@/components/ai-style/AiStyleUi";
import type { useAiStyleFlow } from "@/components/ai-style/useAiStyleFlow";
import type { Audience } from "@/lib/mock-data";

type Flow = ReturnType<typeof useAiStyleFlow>;

type Props = {
  flow: Flow;
  audience: Audience;
};

export function AiStyleFlow({ flow, audience }: Props) {
  const { t } = useTranslation();
  const {
    photo,
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
    reset,
  } = flow;
  const [saved, setSaved] = useState<string[]>([]);

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
        step={step}
        photo={photo}
        validating={validating}
        analyzing={analyzing}
        done={done}
        result={result}
        saved={saved}
        onToggleSave={toggleSave}
        onReset={reset}
        openFile={openFile}
        openCamera={openCamera}
        onAnalyze={() => void analyze(audience)}
      />

      <AiStylePhotoInput fileRef={fileRef} onFile={onFile} />
      <AiStyleCamera open={cameraOpen} onClose={closeCamera} onCapture={onCameraCapture} />
    </>
  );
}
