import { ArrowLeft, Check, CheckCircle2, Loader2, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SURVEY_DIMENSIONS } from "@mybarber/shared/booking-lifecycle";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReview } from "@/hooks/use-reviews-api";
import type { ReviewDimensionScore } from "@/lib/api/reviews";
import { cn } from "@/lib/utils";

type SurveyBooking = {
  id: string;
  salonName: string;
  serviceName: string;
  barberName: string;
  hasReview?: boolean;
};

type Props = {
  booking: SurveyBooking;
  /** Buyurtma tugaganda pastdan avtomatik ochiladi. */
  autoOpen?: boolean;
  /** Faqat sheet — tashqi trigger yo'q (BookingCard va h.k.). */
  triggerless?: boolean;
};

type StepId = "celebrate" | "overall" | "barber" | "salon" | "comment";

const STEPS: StepId[] = ["overall", "barber", "salon", "comment"];

const EXPRESSIONS = [
  { emoji: "😍", label: "A'lo!", rating: 5 },
  { emoji: "🙂", label: "Yaxshi", rating: 4 },
  { emoji: "😐", label: "O'rtacha", rating: 3 },
  { emoji: "😕", label: "Yomon", rating: 2 },
] as const;

function StarRow({
  value,
  onChange,
  size = "lg",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "lg" | "md";
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const v = i + 1;
        return (
          <button key={v} type="button" onClick={() => onChange(v)} className="rounded-lg p-0.5">
            <Star
              className={cn(
                "transition-colors",
                size === "lg" ? "size-9" : "size-7",
                v <= value ? "fill-amber-400 text-amber-400" : "text-border",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function PostCompletionSurvey({
  booking,
  autoOpen = false,
  triggerless = false,
}: Props) {
  const createReview = useCreateReview();
  const [open, setOpen] = useState(autoOpen);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(autoOpen);
  const [stepIdx, setStepIdx] = useState(0);

  const [barberRating, setBarberRating] = useState(0);
  const [salonRating, setSalonRating] = useState(0);
  const [barberDims, setBarberDims] = useState<Record<string, number>>({});
  const [salonDims, setSalonDims] = useState<Record<string, number>>({});
  const [barberText, setBarberText] = useState("");
  const [salonText, setSalonText] = useState("");

  useEffect(() => {
    if (autoOpen && !booking.hasReview) {
      setOpen(true);
      setShowCelebrate(true);
    }
  }, [autoOpen, booking.hasReview]);

  useEffect(() => {
    if (!open) {
      setSheetVisible(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setSheetVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const step = STEPS[stepIdx];

  const dimensions = useMemo<ReviewDimensionScore[]>(() => {
    const out: ReviewDimensionScore[] = [];
    for (const [slug, score] of Object.entries(barberDims)) {
      if (score >= 1) out.push({ target: "barber", dimension: slug, score });
    }
    for (const [slug, score] of Object.entries(salonDims)) {
      if (score >= 1) out.push({ target: "salon", dimension: slug, score });
    }
    return out;
  }, [barberDims, salonDims]);

  if (booking.hasReview) return null;

  const close = () => {
    setSheetVisible(false);
    window.setTimeout(() => {
      setOpen(false);
      setStepIdx(0);
      setShowCelebrate(false);
    }, 280);
  };

  const startSurvey = () => {
    setShowCelebrate(false);
  };

  const applyExpression = (rating: number) => {
    setBarberRating(rating);
    setSalonRating(rating);
  };

  const next = () => {
    if (step === "overall" && (barberRating < 1 || salonRating < 1)) {
      toast.error("Sartarosh va salonni baholang.");
      return;
    }
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };

  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  const submit = async () => {
    try {
      await createReview.mutateAsync({
        booking: parseInt(booking.id, 10),
        rating: barberRating,
        text: barberText.trim(),
        salon_rating: salonRating,
        salon_text: salonText.trim(),
        dimensions,
      });
      toast.success("Bahoyingiz uchun rahmat!");
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "So'rovnoma yuborilmadi");
    }
  };

  if (!open) {
    if (triggerless) return null;
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background transition-transform active:scale-[0.98]"
      >
        <Star className="size-4" />
        Xizmatni baholang
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-black/50 transition-opacity duration-300 sm:items-center",
        sheetVisible ? "opacity-100" : "opacity-0",
      )}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "flex max-h-[92vh] w-full max-w-md flex-col rounded-t-[28px] bg-background transition-transform duration-300 ease-out sm:max-h-[88vh] sm:rounded-[28px]",
          sheetVisible ? "translate-y-0" : "translate-y-full sm:translate-y-8 sm:scale-95",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <button
            type="button"
            onClick={showCelebrate ? close : stepIdx === 0 ? close : back}
            className="flex size-9 items-center justify-center rounded-full bg-surface"
          >
            {showCelebrate || stepIdx === 0 ? (
              <X className="size-4" />
            ) : (
              <ArrowLeft className="size-4" />
            )}
          </button>
          {!showCelebrate ? (
            <div className="flex flex-1 items-center justify-center gap-1.5">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i <= stepIdx ? "w-6 bg-foreground" : "w-3 bg-border",
                  )}
                />
              ))}
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <button
            type="button"
            onClick={close}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Keyinroq
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {showCelebrate ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="grid size-20 place-items-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="size-10 text-emerald-600" strokeWidth={2} />
              </div>
              <h3 className="mt-6 text-2xl font-bold">Buyurtma yakunlandi!</h3>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                {booking.salonName} · {booking.serviceName}
              </p>
              <p className="mt-1 text-sm font-semibold">{booking.barberName}</p>
              <button
                type="button"
                onClick={startSurvey}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-4 text-sm font-bold text-background"
              >
                <Star className="size-4" />
                Baholashni boshlash
              </button>
            </div>
          ) : null}

          {!showCelebrate && step === "overall" ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">Xizmatdan qanchalik mamnunsiz?</h3>
                <p className="mt-1 text-sm text-muted-foreground">Tez ifoda tanlang yoki yulduz qo'ying.</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {EXPRESSIONS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => applyExpression(item.rating)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl bg-surface px-2 py-3 transition-transform active:scale-95",
                      barberRating === item.rating && "ring-2 ring-foreground",
                    )}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="text-[10px] font-bold">{item.label}</span>
                  </button>
                ))}
              </div>
              <div className="rounded-2xl bg-surface/80 p-4">
                <p className="text-sm font-bold">Sartarosh</p>
                <p className="mb-3 text-xs text-muted-foreground">{booking.barberName}</p>
                <StarRow value={barberRating} onChange={setBarberRating} />
              </div>
              <div className="rounded-2xl bg-surface/80 p-4">
                <p className="text-sm font-bold">Salon</p>
                <p className="mb-3 text-xs text-muted-foreground">{booking.salonName}</p>
                <StarRow value={salonRating} onChange={setSalonRating} />
              </div>
            </div>
          ) : null}

          {!showCelebrate && step === "barber" ? (
            <SurveyDimensionStep
              title="Sartarosh haqida"
              subtitle={booking.barberName}
              dimensions={SURVEY_DIMENSIONS.barber}
              values={barberDims}
              onChange={(slug, v) => setBarberDims((p) => ({ ...p, [slug]: v }))}
            />
          ) : null}

          {!showCelebrate && step === "salon" ? (
            <SurveyDimensionStep
              title="Salon haqida"
              subtitle={booking.salonName}
              dimensions={SURVEY_DIMENSIONS.salon}
              values={salonDims}
              onChange={(slug, v) => setSalonDims((p) => ({ ...p, [slug]: v }))}
            />
          ) : null}

          {!showCelebrate && step === "comment" ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">Izoh qoldirasizmi?</h3>
                <p className="mt-1 text-sm text-muted-foreground">Ixtiyoriy — fikringiz boshqalarga yordam beradi.</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold">Sartarosh uchun</p>
                <Textarea
                  className="min-h-[80px] rounded-2xl border-0 bg-surface"
                  placeholder="Sartarosh haqida fikringiz…"
                  value={barberText}
                  onChange={(e) => setBarberText(e.target.value)}
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold">Salon uchun</p>
                <Textarea
                  className="min-h-[80px] rounded-2xl border-0 bg-surface"
                  placeholder="Salon haqida fikringiz…"
                  value={salonText}
                  onChange={(e) => setSalonText(e.target.value)}
                />
              </div>
            </div>
          ) : null}
        </div>

        {!showCelebrate ? (
          <div className="border-t border-border px-5 py-4">
            {step === "comment" ? (
              <button
                type="button"
                disabled={createReview.isPending}
                onClick={() => void submit()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background disabled:opacity-60"
              >
                {createReview.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Yuborish
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background"
              >
                Davom etish
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SurveyDimensionStep({
  title,
  subtitle,
  dimensions,
  values,
  onChange,
}: {
  title: string;
  subtitle: string;
  dimensions: { slug: string; label: string }[];
  values: Record<string, number>;
  onChange: (slug: string, value: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-4">
        {dimensions.map((d) => (
          <div key={d.slug} className="rounded-2xl bg-surface/80 p-4">
            <p className="mb-3 text-sm font-semibold">{d.label}</p>
            <StarRow value={values[d.slug] ?? 0} onChange={(v) => onChange(d.slug, v)} size="md" />
          </div>
        ))}
      </div>
    </div>
  );
}
