import { ArrowLeft, Check, Loader2, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
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
  /** Notification'dan kelganda to'liq ekran modal avtomatik ochiladi. */
  autoOpen?: boolean;
};

type StepId = "overall" | "barber" | "salon" | "comment";

const STEPS: StepId[] = ["overall", "barber", "salon", "comment"];

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

export function PostCompletionSurvey({ booking, autoOpen = false }: Props) {
  const createReview = useCreateReview();
  const [open, setOpen] = useState(autoOpen);
  const [stepIdx, setStepIdx] = useState(0);

  const [barberRating, setBarberRating] = useState(0);
  const [salonRating, setSalonRating] = useState(0);
  const [barberDims, setBarberDims] = useState<Record<string, number>>({});
  const [salonDims, setSalonDims] = useState<Record<string, number>>({});
  const [barberText, setBarberText] = useState("");
  const [salonText, setSalonText] = useState("");

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
    setOpen(false);
    setStepIdx(0);
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
    return (
      <div className="rounded-[24px] border border-border bg-background p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]">
        <h2 className="text-base font-bold">Xizmatni baholang</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {booking.salonName} · {booking.serviceName} bo'yicha qisqa so'rovnoma.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background"
        >
          <Star className="size-4" />
          Baholashni boshlash
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="flex h-[92vh] w-full max-w-md flex-col rounded-t-[28px] bg-background sm:h-auto sm:max-h-[88vh] sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <button
            type="button"
            onClick={stepIdx === 0 ? close : back}
            className="flex size-9 items-center justify-center rounded-full border border-border"
          >
            {stepIdx === 0 ? <X className="size-4" /> : <ArrowLeft className="size-4" />}
          </button>
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
          <button
            type="button"
            onClick={close}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Keyinroq
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {step === "overall" ? (
            <div className="space-y-7">
              <div>
                <h3 className="text-lg font-bold">Xizmatdan mamnunmisiz?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sartarosh va salonni alohida baholang.
                </p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-sm font-bold">Sartarosh</p>
                <p className="mb-3 text-xs text-muted-foreground">{booking.barberName}</p>
                <StarRow value={barberRating} onChange={setBarberRating} />
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-sm font-bold">Salon</p>
                <p className="mb-3 text-xs text-muted-foreground">{booking.salonName}</p>
                <StarRow value={salonRating} onChange={setSalonRating} />
              </div>
            </div>
          ) : null}

          {step === "barber" ? (
            <SurveyDimensionStep
              title="Sartarosh haqida"
              subtitle={booking.barberName}
              dimensions={SURVEY_DIMENSIONS.barber}
              values={barberDims}
              onChange={(slug, v) => setBarberDims((p) => ({ ...p, [slug]: v }))}
            />
          ) : null}

          {step === "salon" ? (
            <SurveyDimensionStep
              title="Salon haqida"
              subtitle={booking.salonName}
              dimensions={SURVEY_DIMENSIONS.salon}
              values={salonDims}
              onChange={(slug, v) => setSalonDims((p) => ({ ...p, [slug]: v }))}
            />
          ) : null}

          {step === "comment" ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">Izoh qoldirasizmi?</h3>
                <p className="mt-1 text-sm text-muted-foreground">Ixtiyoriy — fikringiz biz uchun muhim.</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold">Sartarosh uchun</p>
                <Textarea
                  className="min-h-[80px] rounded-2xl"
                  placeholder="Sartarosh haqida fikringiz…"
                  value={barberText}
                  onChange={(e) => setBarberText(e.target.value)}
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold">Salon uchun</p>
                <Textarea
                  className="min-h-[80px] rounded-2xl"
                  placeholder="Salon haqida fikringiz…"
                  value={salonText}
                  onChange={(e) => setSalonText(e.target.value)}
                />
              </div>
            </div>
          ) : null}
        </div>

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
      <div className="space-y-5">
        {dimensions.map((d) => (
          <div key={d.slug} className="rounded-2xl border border-border p-4">
            <p className="mb-3 text-sm font-semibold">{d.label}</p>
            <StarRow value={values[d.slug] ?? 0} onChange={(v) => onChange(d.slug, v)} size="md" />
          </div>
        ))}
      </div>
    </div>
  );
}
