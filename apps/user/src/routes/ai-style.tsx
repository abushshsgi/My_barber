import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  RefreshCw,
  ScanFace,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai-style")({
  head: () => ({
    meta: [
      { title: "AI Stil maslahatchi — mysaloon.uz" },
      { name: "description", content: "Selfie yuklang — AI yuz shakliga mos turmag va ranglarni tavsiya qiladi." },
    ],
  }),
  component: AiStylePage,
});

interface Suggestion {
  id: string;
  title: string;
  desc: string;
  match: number;
  tag: string;
}

const SUGGESTIONS: Suggestion[] = [
  { id: "s1", title: "Textured Crop", desc: "Yuz shakli ovalsiz — qisqa, yengil tepada", match: 94, tag: "Erkak" },
  { id: "s2", title: "Mid Fade + Quiff", desc: "Klassik kontur, hajmli tepa", match: 88, tag: "Erkak" },
  { id: "s3", title: "Soft Layered Bob", desc: "Yumshoq qatlamlar, yuzga ramka", match: 82, tag: "Ayol" },
];

type Step = "upload" | "analyze" | "results";

function MatchBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface">
      <motion.div
        className="h-full rounded-full bg-foreground"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

function AiStylePage() {
  const { t } = useTranslation();
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const step: Step = !photo ? "upload" : analyzing ? "analyze" : done ? "results" : "upload";

  const steps = [
    { key: "upload" as const, label: t("aiStylePage.steps.upload") },
    { key: "analyze" as const, label: t("aiStylePage.steps.analyze") },
    { key: "results" as const, label: t("aiStylePage.steps.results") },
  ];

  const onFile = (f: File | null | undefined) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
      setDone(false);
    };
    reader.readAsDataURL(f);
  };

  const analyze = () => {
    setAnalyzing(true);
    setDone(false);
    setTimeout(() => {
      setAnalyzing(false);
      setDone(true);
    }, 2000);
  };

  const reset = () => {
    setPhoto(null);
    setDone(false);
    setAnalyzing(false);
  };

  return (
    <div className="min-h-full bg-background pb-28">
      <PageHeader
        showBack
        title={t("aiStylePage.title")}
        subtitle={t("aiStylePage.subtitle")}
      />

      {/* Steps */}
      <div className="px-5">
        <div className="flex gap-2">
          {steps.map(({ key, label }, i) => {
            const active = step === key;
            const completed =
              (key === "upload" && photo) ||
              (key === "analyze" && done) ||
              (key === "results" && done);
            return (
              <div
                key={key}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : completed
                      ? "border-foreground/30 bg-surface text-foreground"
                      : "border-border bg-surface/40 text-muted-foreground",
                )}
              >
                <span className="text-[10px] font-bold tabular-nums">{i + 1}</span>
                <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Intro */}
      {!done && (
        <div className="mx-5 mt-4 rounded-[22px] border border-border bg-surface/50 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-foreground text-background">
              <Wand2 className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-sm font-bold">{t("aiStylePage.introTitle")}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                {t("aiStylePage.introDesc")}
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="mt-5 px-5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />

        {!photo ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-4 rounded-[28px] border-2 border-dashed border-foreground/20 bg-surface active:scale-[0.99]"
          >
            <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-foreground/15 bg-background">
              <Camera className="h-9 w-9" strokeWidth={2} />
            </div>
            <div className="max-w-[220px] text-center">
              <p className="text-base font-bold">{t("aiStylePage.uploadTitle")}</p>
              <p className="mt-1.5 text-[12px] text-muted-foreground">{t("aiStylePage.uploadHint")}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-[12px] font-bold text-background">
              <Upload className="h-4 w-4" strokeWidth={2.4} />
              {t("aiStylePage.pickPhoto")}
            </span>
          </button>
        ) : (
          <div className="relative overflow-hidden rounded-[28px] border border-border bg-foreground">
            <img src={photo} alt="" className="aspect-[4/5] w-full object-cover opacity-95" />
            {analyzing && (
              <>
                <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]" />
                <motion.div
                  className="absolute inset-x-4 h-px bg-background/80 shadow-[0_0_12px_oklch(0.97_0.011_85/0.8)]"
                  animate={{ top: ["12%", "88%", "12%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="rounded-2xl bg-background/90 px-4 py-3 text-center backdrop-blur-sm">
                    <ScanFace className="mx-auto h-8 w-8 animate-pulse" strokeWidth={2} />
                    <p className="mt-2 text-sm font-bold">{t("aiStylePage.analyzing")}</p>
                  </div>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={reset}
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-background/90 text-foreground backdrop-blur-sm active:scale-95"
              aria-label={t("aiStylePage.retake")}
            >
              <RefreshCw className="h-4 w-4" strokeWidth={2.4} />
            </button>
          </div>
        )}

        {photo && !done && !analyzing && (
          <button
            type="button"
            onClick={analyze}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-4 text-sm font-bold text-background active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" strokeWidth={2.4} />
            {t("aiStylePage.analyzeBtn")}
          </button>
        )}
      </section>

      <AnimatePresence>
        {done && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 px-5"
          >
            <div className="rounded-[22px] bg-foreground p-4 text-background">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/55">
                {t("aiStylePage.faceShape")}
              </p>
              <p className="mt-1 text-xl font-bold">{t("aiStylePage.faceOval")}</p>
              <p className="mt-2 text-[12px] text-background/70">{t("aiStylePage.resultDesc")}</p>
            </div>

            <div className="mt-5 flex items-end justify-between">
              <h2 className="text-lg font-bold">{t("aiStylePage.suggestionsTitle")}</h2>
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold">
                AI
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {SUGGESTIONS.map((s, i) => (
                <motion.article
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="overflow-hidden rounded-[20px] border border-border bg-card"
                >
                  <div className="flex gap-3 p-3">
                    <div className="relative flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl bg-surface-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        #{i + 1}
                      </span>
                      <span className="mt-0.5 text-lg font-bold tabular-nums">{s.match}%</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[15px] font-bold leading-tight">{s.title}</h3>
                        <span className="shrink-0 rounded-md bg-surface px-2 py-0.5 text-[9px] font-bold uppercase">
                          {s.tag}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                        {s.desc}
                      </p>
                      <div className="mt-2.5">
                        <MatchBar value={s.match} />
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/explore"
                    className="flex items-center justify-between border-t border-border/80 bg-surface/30 px-4 py-2.5 text-[11px] font-bold active:bg-surface/60"
                  >
                    {t("aiStylePage.findStylist")}
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </Link>
                </motion.article>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-2xl border border-border bg-background py-3 text-[12px] font-bold active:scale-[0.98]"
              >
                {t("aiStylePage.tryAgain")}
              </button>
              <Link
                to="/explore"
                className="flex items-center justify-center rounded-2xl bg-foreground py-3 text-[12px] font-bold text-background active:scale-[0.98]"
              >
                {t("aiStylePage.exploreStyles")}
              </Link>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
