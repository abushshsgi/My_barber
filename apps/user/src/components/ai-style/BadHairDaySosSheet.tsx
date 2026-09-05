import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  Loader2,
  RotateCcw,
  Scissors,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  generateSosFix,
  type SosFix,
  type SosIssue,
  type SosTime,
  type SosTool,
} from "@/lib/api/care-products";
import { cn } from "@/lib/utils";

type Phase = 1 | 2 | 3 | "loading" | "result";

const ease = [0.22, 1, 0.36, 1] as const;

const TIME_OPTS: { value: SosTime; emoji: string; key: string; fallback: string; hint: string }[] = [
  { value: "2min", emoji: "⚡", key: "time2", fallback: "2 daqiqa", hint: "Atigi 2 min bor" },
  { value: "5-10min", emoji: "⏱️", key: "time5", fallback: "5-10 daqiqa", hint: "Biroz vaqt bor" },
  { value: "15min+", emoji: "⏳", key: "time15", fallback: "15+ daqiqa", hint: "Vaqt yetarli" },
];

const ISSUE_OPTS: { value: SosIssue; emoji: string; key: string; fallback: string }[] = [
  { value: "frizzy", emoji: "💨", key: "issueFrizzy", fallback: "Chirib ketgan" },
  { value: "oily", emoji: "💧", key: "issueOily", fallback: "Yog'lanib qolgan" },
  { value: "bedhead", emoji: "🌀", key: "issueBedhead", fallback: "Shaklsiz / g'ijim" },
  { value: "dry", emoji: "🌵", key: "issueDry", fallback: "Juda quruq" },
];

const TOOL_OPTS: { value: SosTool; emoji: string; key: string; fallback: string }[] = [
  { value: "dryer", emoji: "🌬️", key: "toolDryer", fallback: "Fen" },
  { value: "dry_shampoo", emoji: "🧴", key: "toolDryShampoo", fallback: "Quruq shampun" },
  { value: "water_spray", emoji: "💦", key: "toolSpray", fallback: "Suv purkagich" },
  { value: "comb", emoji: "🪮", key: "toolComb", fallback: "Taroq / braking" },
  { value: "wax_gel", emoji: "✨", key: "toolWax", fallback: "Vosk / gel / lak" },
  { value: "nothing", emoji: "🤲", key: "toolNothing", fallback: "Hech narsa yo'q" },
];

const LOADING_LINES = [
  "Morf AI tezkor yechim qidirmoqda…",
  "Vositalaringizga moslashtirilmoqda…",
  "Tezkor pricheska tanlanmoqda…",
];

/** Emergency "Bad Hair Day" wizard — 3 savol, keyin 60 soniyalik yechim. */
export function BadHairDaySosSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(1);
  const [time, setTime] = useState<SosTime | null>(null);
  const [issues, setIssues] = useState<SosIssue[]>([]);
  const [tools, setTools] = useState<SosTool[]>([]);
  const [fix, setFix] = useState<SosFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (!open) return;
    setPhase(1);
    setTime(null);
    setIssues([]);
    setTools([]);
    setFix(null);
    setError(null);
    setConfetti(false);
  }, [open]);

  useEffect(() => {
    if (phase !== "loading") return;
    setLine(0);
    const id = setInterval(() => setLine((n) => (n + 1) % LOADING_LINES.length), 900);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const toggleIssue = (v: SosIssue) =>
    setIssues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const toggleTool = (v: SosTool) =>
    setTools((prev) => {
      if (v === "nothing") return prev.includes("nothing") ? [] : ["nothing"];
      const next = prev.filter((x) => x !== "nothing");
      return next.includes(v) ? next.filter((x) => x !== v) : [...next, v];
    });

  const run = async () => {
    if (!time || issues.length === 0) return;
    setPhase("loading");
    setError(null);
    try {
      const res = await generateSosFix({
        time_available: time,
        hair_issue: issues,
        tools_available: tools.length ? tools : ["nothing"],
      });
      setFix(res);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tezkor yechim topilmadi.");
      setPhase(3);
    }
  };

  const done = () => {
    setConfetti(true);
    window.setTimeout(onClose, reduce ? 0 : 620);
  };

  const canNext = phase === 1 ? !!time : phase === 2 ? issues.length > 0 : true;

  const stepTitle = useMemo(() => {
    if (phase === 1)
      return t("aiStylePage.care.sos.q1", { defaultValue: "Qancha vaqtingiz bor?" });
    if (phase === 2)
      return t("aiStylePage.care.sos.q2", { defaultValue: "Asosiy muammo nima?" });
    return t("aiStylePage.care.sos.q3", { defaultValue: "Qo'l ostingizda nima bor?" });
  }, [phase, t]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={reduce ? false : { y: "100%", opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
            transition={{ duration: 0.34, ease }}
            className="relative z-[1] w-full max-w-md overflow-hidden rounded-t-[28px] bg-white text-[#111111] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:rounded-[28px] sm:shadow-[0_24px_60px_rgba(0,0,0,0.24)]"
          >
            <div className="relative bg-gradient-to-br from-[#FF6B57] via-[#FF8A5B] to-[#E9527A] px-5 pb-5 pt-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-full bg-white/20">
                    <Zap className="size-4" strokeWidth={2.5} />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-white/75">
                      SOS
                    </p>
                    <p className="text-[15px] font-semibold leading-tight">
                      {t("aiStylePage.care.sos.sheetTitle", {
                        defaultValue: "Tezkor yechim",
                      })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("common.close", { defaultValue: "Yopish" })}
                  className="grid size-8 cursor-pointer place-items-center rounded-full bg-white/15 transition-transform active:scale-95"
                >
                  <X className="size-4" strokeWidth={2.5} />
                </button>
              </div>

              {phase !== "result" ? (
                <div className="mt-4 flex gap-1.5">
                  {[1, 2, 3].map((n) => {
                    const idx = phase === "loading" ? 3 : phase;
                    return (
                      <div key={n} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                        <motion.div
                          className="h-full rounded-full bg-white"
                          initial={false}
                          animate={{ width: n <= idx ? "100%" : "0%" }}
                          transition={{ duration: reduce ? 0 : 0.3, ease }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={String(phase)}
                  initial={reduce ? false : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? undefined : { opacity: 0, x: -18 }}
                  transition={{ duration: 0.24, ease }}
                >
                  {phase === "loading" ? (
                    <div className="grid min-h-[13rem] place-items-center text-center">
                      <div>
                        <Loader2 className="mx-auto size-7 animate-spin text-[#FF6B57]" />
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={line}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.24 }}
                            className="mt-4 text-[14px] font-medium text-[#111111]/60"
                          >
                            {LOADING_LINES[line]}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                    </div>
                  ) : phase === "result" && fix ? (
                    <ResultView fix={fix} onDone={done} onRetry={() => setPhase(1)} />
                  ) : (
                    <>
                      <h2 className="text-[1.35rem] font-semibold leading-tight tracking-tight">
                        {stepTitle}
                      </h2>
                      {phase !== 1 ? (
                        <p className="mt-1.5 text-[13px] text-[#111111]/45">
                          {t("aiStylePage.care.sos.multiHint", {
                            defaultValue: "Bir nechtasini tanlashingiz mumkin",
                          })}
                        </p>
                      ) : null}

                      <div className="mt-5 space-y-2">
                        {phase === 1
                          ? TIME_OPTS.map((opt, i) => (
                              <OptionRow
                                key={opt.value}
                                index={i}
                                emoji={opt.emoji}
                                label={t(`aiStylePage.care.sos.${opt.key}`, {
                                  defaultValue: opt.fallback,
                                })}
                                hint={opt.hint}
                                selected={time === opt.value}
                                onClick={() => {
                                  setTime(opt.value);
                                  window.setTimeout(() => setPhase(2), reduce ? 0 : 160);
                                }}
                              />
                            ))
                          : phase === 2
                            ? ISSUE_OPTS.map((opt, i) => (
                                <OptionRow
                                  key={opt.value}
                                  index={i}
                                  emoji={opt.emoji}
                                  label={t(`aiStylePage.care.sos.${opt.key}`, {
                                    defaultValue: opt.fallback,
                                  })}
                                  selected={issues.includes(opt.value)}
                                  onClick={() => toggleIssue(opt.value)}
                                />
                              ))
                            : null}
                      </div>

                      {phase === 3 ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {TOOL_OPTS.map((opt, i) => {
                            const selected = tools.includes(opt.value);
                            return (
                              <motion.button
                                key={opt.value}
                                type="button"
                                initial={reduce ? false : { opacity: 0, scale: 0.94 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.03, duration: 0.22, ease }}
                                onClick={() => toggleTool(opt.value)}
                                className={cn(
                                  "cursor-pointer rounded-full px-3.5 py-2.5 text-[13px] font-medium transition-colors",
                                  selected
                                    ? "bg-[#111111] text-white"
                                    : "bg-[#F2F2F2] text-[#111111]/70",
                                )}
                              >
                                <span className="mr-1.5">{opt.emoji}</span>
                                {t(`aiStylePage.care.sos.${opt.key}`, {
                                  defaultValue: opt.fallback,
                                })}
                              </motion.button>
                            );
                          })}
                        </div>
                      ) : null}

                      {error ? (
                        <p className="mt-4 rounded-2xl bg-[#FFF1EE] px-3.5 py-3 text-[13px] text-[#C2410C]">
                          {error}
                        </p>
                      ) : null}

                      <div className="mt-6 flex gap-2">
                        {phase > 1 ? (
                          <button
                            type="button"
                            onClick={() => setPhase((phase === 3 ? 2 : 1) as Phase)}
                            className="h-12 flex-1 cursor-pointer rounded-full border border-black/10 text-sm font-semibold"
                          >
                            {t("common.back")}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={!canNext}
                          onClick={() => {
                            if (phase === 3) void run();
                            else setPhase(((phase as number) + 1) as Phase);
                          }}
                          className={cn(
                            "h-12 flex-[1.7] rounded-full text-sm font-semibold text-white transition-transform",
                            canNext
                              ? "cursor-pointer bg-gradient-to-r from-[#FF6B57] to-[#E9527A] active:scale-[0.98]"
                              : "cursor-not-allowed bg-[#111111]/15",
                          )}
                        >
                          {phase === 3
                            ? t("aiStylePage.care.sos.generate", {
                                defaultValue: "Yechim topish",
                              })
                            : t("common.next")}
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {confetti ? <Confetti /> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function OptionRow({
  emoji,
  label,
  hint,
  selected,
  onClick,
  index,
}: {
  emoji: string;
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
  index: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.26, ease }}
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors active:scale-[0.99]",
        selected ? "bg-[#111111] text-white" : "bg-[#F7F7F7] text-[#111111]",
      )}
    >
      <span className="text-[19px] leading-none">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold leading-tight">{label}</span>
        {hint ? (
          <span
            className={cn(
              "mt-0.5 block text-[12px]",
              selected ? "text-white/60" : "text-[#111111]/40",
            )}
          >
            {hint}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border",
          selected ? "border-white bg-white" : "border-black/15",
        )}
      >
        {selected ? <Check className="size-3 text-[#111111]" strokeWidth={3} /> : null}
      </span>
    </motion.button>
  );
}

function ResultView({
  fix,
  onDone,
  onRetry,
}: {
  fix: SosFix;
  onDone: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  return (
    <div>
      <h2 className="text-[1.3rem] font-semibold leading-tight tracking-tight">{fix.title}</h2>

      <section className="mt-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#111111]/35">
          ⚡ {t("aiStylePage.care.sos.quickFix", { defaultValue: "60 soniyalik yechim" })}
        </p>
        <ol className="mt-2.5 space-y-1.5">
          {fix.steps.map((step, i) => (
            <motion.li
              key={step}
              initial={reduce ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.28, ease }}
              className="flex gap-3 rounded-2xl bg-[#F7F7F7] px-3.5 py-3 text-[14px] leading-snug"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#111111] text-[11px] font-bold text-white">
                {i + 1}
              </span>
              {step}
            </motion.li>
          ))}
        </ol>
      </section>

      <motion.section
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3, ease }}
        className="mt-5 rounded-2xl bg-gradient-to-br from-[#FFF3EF] to-[#FDECF1] px-4 py-3.5"
      >
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#E9527A]">
          <Scissors className="size-3" />
          {t("aiStylePage.care.sos.styleTitle", { defaultValue: "Bugungi tezkor pricheska" })}
        </p>
        <p className="mt-1 text-[15px] font-semibold">{fix.suggested_hairstyle}</p>
      </motion.section>

      <motion.section
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26, duration: 0.3, ease }}
        className="mt-3 rounded-2xl bg-[#111111] px-4 py-3.5 text-white"
      >
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/50">
          <Sparkles className="size-3" />
          {t("aiStylePage.care.sos.proTip", { defaultValue: "Pro maslahat" })}
        </p>
        <p className="mt-1 text-[14px] leading-snug text-white/90">{fix.pro_tip}</p>
      </motion.section>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          aria-label={t("aiStylePage.care.sos.again", { defaultValue: "Qayta" })}
          className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full border border-black/10"
        >
          <RotateCcw className="size-4" />
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-12 flex-1 cursor-pointer rounded-full bg-gradient-to-r from-[#FF6B57] to-[#E9527A] text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          {t("aiStylePage.care.sos.done", { defaultValue: "Bajarildi!" })}
        </button>
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ["#FF6B57", "#E9527A", "#FFC857", "#4ADE80", "#60A5FA"];

function Confetti() {
  const reduce = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        x: (i - 7) * 22 + (i % 3) * 6,
        rotate: (i % 2 ? 1 : -1) * (90 + i * 12),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: (i % 5) * 0.02,
      })),
    [],
  );
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-16 grid place-items-center">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute size-2 rounded-[2px]"
          style={{ backgroundColor: p.color }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, x: p.x, y: -110 - (p.id % 4) * 26, rotate: p.rotate }}
          transition={{ duration: 0.62, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
