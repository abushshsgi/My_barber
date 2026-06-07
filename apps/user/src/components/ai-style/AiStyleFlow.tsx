import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AiStyleCamera } from "@/components/ai-style/AiStyleCamera";
import { AiStylePhotoInput } from "@/components/ai-style/AiStyleUi";
import {
  loadAiStyleVariant,
  saveAiStyleVariant,
  type AiStyleVariant,
} from "@/components/ai-style/ai-style-variants";
import {
  BentoVariant,
  ImmersiveVariant,
  MirrorVariant,
  SplitVariant,
  WizardVariant,
} from "@/components/ai-style/AiStyleVariantLayouts";
import { AiStyleVariantPicker } from "@/components/ai-style/AiStyleVariantPicker";
import type { useAiStyleFlow } from "@/components/ai-style/useAiStyleFlow";
import type { Audience } from "@/lib/mock-data";

type Flow = ReturnType<typeof useAiStyleFlow>;

type Props = {
  flow: Flow;
  audience: Audience;
};

const VARIANTS = {
  mirror: MirrorVariant,
  immersive: ImmersiveVariant,
  wizard: WizardVariant,
  split: SplitVariant,
  bento: BentoVariant,
} as const;

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
  const [variant, setVariant] = useState<AiStyleVariant>(() => loadAiStyleVariant());

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

  const handleVariantChange = (next: AiStyleVariant) => {
    setVariant(next);
    saveAiStyleVariant(next);
  };

  const Layout = VARIANTS[variant];
  const layoutProps = {
    step,
    photo,
    validating,
    analyzing,
    done,
    result,
    saved,
    onToggleSave: toggleSave,
    onReset: reset,
    openFile,
    openCamera,
    onAnalyze: () => void analyze(audience),
  };

  return (
    <>
      <Layout {...layoutProps} />

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom)+8px)] z-[60] px-4">
        <div className="pointer-events-auto mx-auto max-w-md">
          <AiStyleVariantPicker variant={variant} onChange={handleVariantChange} />
        </div>
      </div>

      <AiStylePhotoInput fileRef={fileRef} onFile={onFile} />
      <AiStyleCamera open={cameraOpen} onClose={closeCamera} onCapture={onCameraCapture} />
    </>
  );
}
