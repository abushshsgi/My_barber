import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2 } from "lucide-react";
import { hasValidUserSession } from "@/lib/api/client";
import { useUpdateHairCareProfile } from "@/hooks/use-hair-care-profile";
import type { HairColorStatus, HairCondition, HairTexture } from "@/lib/api/hair-care-profile";
import { saveCareQuiz } from "@/lib/morf-ai-care";
import { cn } from "@/lib/utils";

const CONDITIONS: HairCondition[] = ["oily", "dry", "normal", "damaged"];
const TEXTURES: HairTexture[] = ["straight", "wavy", "curly"];
const COLORS: HairColorStatus[] = ["natural", "colored", "bleached"];

export type HairAskAnswers = {
  condition: HairCondition;
  texture: HairTexture;
  color_status: HairColorStatus;
};

type Props = {
  /** Ilovadagi typewriter matni. */
  lead: string;
  onDone: (answers: HairAskAnswers) => void | Promise<void>;
};

/**
 * Ilovadagi HairConditionQuiz: avval matn yoziladi, keyin katta tugmalar.
 * Natija shu userning soch profiliga saqlanadi.
 */
export function HairConditionAsk({ lead, onDone }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const saveProfile = useUpdateHairCareProfile();
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
        wait = setTimeout(() => setShowQuiz(true), 1200);
      }
    }, 28);
    return () => {
      clearInterval(tick);
      if (wait) clearTimeout(wait);
    };
  }, [lead]);

  if (!hasValidUserSession()) {
    return (
      <div className="mx-auto max-w-sm pt-16 text-center">
        <h2 className="text-xl font-semibold tracking-tight">Avval hisobingizga kiring</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#111111]/55">
          Soch holati shu hisobga saqlanadi. Parvarish va chatbot shundan keyin ochiladi.
        </p>
        <button
          type="button"
          onClick={() => void navigate({ to: "/auth", search: { redirect: "/ai-style/care" } })}
          className="mt-6 h-12 cursor-pointer rounded-full bg-[#111111] px-6 text-sm font-semibold text-white"
        >
          Kirish
        </button>
      </div>
    );
  }

  const steps = [
    {
      title: t("aiStylePage.care.onboarding.step1Title", {
        defaultValue: "Sochingiz qanday his qilinadi?",
      }),
      sub: t("aiStylePage.care.onboarding.step1Sub", {
        defaultValue: "AI sizga shaxsiy parvarish rejasi tuzadi — ildiz va uchlarni hisobga olamiz.",
      }),
      options: CONDITIONS,
      value: condition,
      label: (id: string) => t(`aiStylePage.care.conditions.${id}`, { defaultValue: id }),
      pick: (id: string) => setCondition(id as HairCondition),
    },
    {
      title: t("aiStylePage.care.onboarding.step2Title", {
        defaultValue: "Soch teksturasi qanday?",
      }),
      sub: t("aiStylePage.care.onboarding.step2Sub", {
        defaultValue: "To‘g‘ri, to‘lqinsimon yoki jingalak — styling va mahsulot tanloviga ta’sir qiladi.",
      }),
      options: TEXTURES,
      value: texture,
      label: (id: string) => t(`aiStylePage.care.textures.${id}`, { defaultValue: id }),
      pick: (id: string) => setTexture(id as HairTexture),
    },
    {
      title: t("aiStylePage.care.onboarding.step3Title", {
        defaultValue: "Rang holati?",
      }),
      sub: t("aiStylePage.care.onboarding.step3Sub", {
        defaultValue: "Tabiiy, bo‘yalgan yoki ochilgan soch uchun alohida tavsiyalar beramiz.",
      }),
      options: COLORS,
      value: colorStatus,
      label: (id: string) => t(`aiStylePage.care.colors.${id}`, { defaultValue: id }),
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
    const answers: HairAskAnswers = {
      condition,
      texture,
      color_status: colorStatus,
    };
    try {
      const saved = await saveProfile.mutateAsync({
        condition,
        texture,
        color_status: colorStatus,
        scalp:
          condition === "oily" ? "oily" : condition === "dry" || condition === "damaged" ? "dry" : "normal",
      });
      if (!saved.complete) {
        setError("Soch tahlili saqlanmadi. Qayta urinib ko‘ring.");
        setBusy(false);
        return;
      }
      saveCareQuiz({ condition, texture, colorStatus });
      await onDone(answers);
    } catch (err) {
      setError(err instanceof Error && err.message.trim() ? err.message : t("common.retry"));
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="text-[15px] leading-6 text-[var(--morph-fg,#111111)]">
        {typed}
        {showQuiz ? null : <span className="text-[var(--morph-muted,#737373)]">|</span>}
      </p>
      {showQuiz ? (
        <div className="mt-5">
          <p className="text-[12px] font-medium text-[var(--morph-muted,#737373)]">
            {step + 1} / {steps.length}
          </p>
          <h2 className="mt-2 text-[22px] font-semibold leading-7 tracking-tight">{current.title}</h2>
          <p className="mt-1.5 text-[14px] leading-5 text-[var(--morph-muted,#737373)]">{current.sub}</p>
          <div className="mt-4 flex flex-col gap-2.5">
            {current.options.map((id) => {
              const on = current.value === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => current.pick(id)}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-[15px] font-medium",
                    on
                      ? "border-[#111111] bg-white dark:border-white dark:bg-[#1C1C1C]"
                      : "border-black/10 bg-white dark:border-white/15 dark:bg-[#141414]",
                  )}
                >
                  <span>{current.label(id)}</span>
                  {on ? <Check className="size-[18px] shrink-0" strokeWidth={2.4} /> : null}
                </button>
              );
            })}
          </div>
          {error ? <p className="mt-3 text-[13px] text-red-600">{error}</p> : null}
          <button
            type="button"
            disabled={!current.value || busy}
            onClick={() => void next()}
            className="mt-5 flex h-[52px] w-full cursor-pointer items-center justify-center rounded-full bg-[#111111] text-[15px] font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : last ? (
              t("aiStylePage.chat.hairAsk.continue", { defaultValue: "Davom etish" })
            ) : (
              t("common.next")
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
