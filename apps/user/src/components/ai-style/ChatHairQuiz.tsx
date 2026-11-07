import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useUpdateHairCareProfile } from "@/hooks/use-hair-care-profile";
import type { HairColorStatus, HairCondition, HairTexture } from "@/lib/api/hair-care-profile";
import { saveCareQuiz } from "@/lib/morf-ai-care";
import { cn } from "@/lib/utils";

const CONDITIONS: HairCondition[] = ["oily", "dry", "normal", "damaged"];
const TEXTURES: HairTexture[] = ["straight", "wavy", "curly"];
const COLORS: HairColorStatus[] = ["natural", "colored", "bleached"];

export type ChatHairAnswers = {
  condition: HairCondition;
  texture: HairTexture;
  color_status: HairColorStatus;
};

type Props = {
  draft: string;
  onSaved: (answers: ChatHairAnswers) => void | Promise<void>;
};

/** Ilovadagi ChatHairAsk: avval yozilgan xabar, keyin soch holati. */
export function ChatHairQuiz({ draft, onSaved }: Props) {
  const { t } = useTranslation();
  const saveProfile = useUpdateHairCareProfile();
  const lead = t("aiStylePage.chat.hairAsk.lead");
  const [typed, setTyped] = useState("");
  const [showQuiz, setShowQuiz] = useState(false);
  const [step, setStep] = useState(0);
  const [condition, setCondition] = useState<HairCondition | "">("");
  const [texture, setTexture] = useState<HairTexture | "">("");
  const [colorStatus, setColorStatus] = useState<HairColorStatus | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let index = 0;
    let wait: ReturnType<typeof setTimeout> | null = null;
    const tick = setInterval(() => {
      index += 1;
      setTyped(lead.slice(0, index));
      if (index >= lead.length) {
        clearInterval(tick);
        wait = setTimeout(() => setShowQuiz(true), 700);
      }
    }, 18);
    return () => {
      clearInterval(tick);
      if (wait) clearTimeout(wait);
    };
  }, [lead]);

  const steps = [
    {
      title: t("aiStylePage.care.quiz.conditionQ"),
      options: CONDITIONS,
      value: condition,
      label: (id: string) => t(`aiStylePage.care.conditions.${id}`),
      pick: (id: string) => setCondition(id as HairCondition),
    },
    {
      title: t("aiStylePage.care.quiz.textureQ"),
      options: TEXTURES,
      value: texture,
      label: (id: string) => t(`aiStylePage.care.textures.${id}`),
      pick: (id: string) => setTexture(id as HairTexture),
    },
    {
      title: t("aiStylePage.care.quiz.colorQ"),
      options: COLORS,
      value: colorStatus,
      label: (id: string) => t(`aiStylePage.care.colors.${id}`),
      pick: (id: string) => setColorStatus(id as HairColorStatus),
    },
  ];
  const current = steps[step]!;
  const last = step === steps.length - 1;

  const next = async () => {
    if (!current.value || busy) return;
    if (!last) {
      setStep((n) => n + 1);
      return;
    }
    if (!condition || !texture || !colorStatus) return;
    setBusy(true);
    setError(null);
    const answers: ChatHairAnswers = {
      condition,
      texture,
      color_status: colorStatus,
    };
    try {
      await saveProfile.mutateAsync({
        condition,
        texture,
        color_status: colorStatus,
        scalp: condition === "oily" ? "oily" : condition === "dry" || condition === "damaged" ? "dry" : "normal",
      });
      saveCareQuiz({ condition, texture, colorStatus });
      await onSaved(answers);
    } catch (err) {
      setError(err instanceof Error && err.message.trim() ? err.message : t("common.retry"));
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end px-4">
        <p className="max-w-[82%] rounded-[22px] rounded-br-md border border-black/10 bg-white px-4 py-3 text-[14px] leading-5 text-[#111111] dark:border-white/15 dark:bg-[#1C1C1C] dark:text-white">
          {draft}
        </p>
      </div>
      <div className="px-4">
        <p className="text-[14px] leading-6 text-[var(--morph-fg,#111111)]">
          {typed}
          {showQuiz ? null : <span className="text-[var(--morph-muted,#737373)]">|</span>}
        </p>
        {showQuiz ? (
          <div className="mt-4">
            <p className="text-[12px] text-[var(--morph-muted,#737373)]">
              {step + 1} / {steps.length}
            </p>
            <p className="mt-1 text-[16px] font-semibold">{current.title}</p>
            <div className="mt-3 flex flex-col gap-2">
              {current.options.map((id) => {
                const on = current.value === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => current.pick(id)}
                    className={cn(
                      "cursor-pointer rounded-2xl border px-4 py-3 text-left text-[14px] font-medium",
                      on
                        ? "border-[#111111] bg-[#111111] text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-black/10 bg-white text-[#111111] dark:border-white/15 dark:bg-[#141414] dark:text-white",
                    )}
                  >
                    {current.label(id)}
                  </button>
                );
              })}
            </div>
            {error ? <p className="mt-2 text-[12px] text-red-600">{error}</p> : null}
            <button
              type="button"
              disabled={!current.value || busy}
              onClick={() => void next()}
              className="mt-4 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-[#111111] px-5 text-[13px] font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-black"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("aiStylePage.care.quiz.seePlan")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
