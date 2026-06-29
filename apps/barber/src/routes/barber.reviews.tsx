import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { SURVEY_DIMENSIONS } from "@mybarber/shared/booking-lifecycle";
import { useBarberContext } from "@/components/barber/BarberContext";
import { UserAvatar } from "@/components/barber/primitives";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

const BARBER_DIMENSION_LABELS: Record<string, string> = SURVEY_DIMENSIONS.barber.reduce(
  (acc, d) => {
    acc[d.slug] = d.label;
    return acc;
  },
  {} as Record<string, string>,
);

export const Route = createFileRoute("/barber/reviews")({
  component: ReviewsPage,
});

function Stars({ value, size = 4 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            `size-${size}`,
            i < value ? "fill-foreground text-foreground" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

function ReviewsPage() {
  const { reviews } = useBarberContext();
  const [replyByReview, setReplyByReview] = useState<Record<string, string>>({});
  const [sentReplyByReview, setSentReplyByReview] = useState<Record<string, string>>({});
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / Math.max(1, reviews.length);
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const dimensionAverages = useMemo(() => {
    return SURVEY_DIMENSIONS.barber.map((d) => {
      const scores = reviews.flatMap((r) =>
        (r.dimensions ?? []).filter((x) => x.dimension === d.slug).map((x) => x.score),
      );
      const dimAvg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return { slug: d.slug, label: d.label, avg: dimAvg, count: scores.length };
    });
  }, [reviews]);

  const hasDimensionData = dimensionAverages.some((d) => d.count > 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-foreground">Sharhlar</h1>
        <p className="text-muted-foreground mt-1 text-sm">Mijozlardan kelgan baholar va izohlar.</p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-card">
        <div className="text-center sm:text-left sm:border-r border-border sm:pr-6">
          <div className="font-heading text-5xl font-semibold text-foreground">
            {avg.toFixed(1)}
          </div>
          <div className="mt-2 flex justify-center sm:justify-start">
            <Stars value={Math.round(avg)} size={5} />
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{reviews.length} ta sharh</div>
        </div>
        <div className="sm:col-span-2 space-y-2">
          {dist.map((d) => (
            <div key={d.star} className="flex items-center gap-3 text-sm">
              <span className="w-6 text-muted-foreground">{d.star}★</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-foreground"
                  style={{
                    width: `${(d.count / Math.max(1, reviews.length)) * 100}%`,
                  }}
                />
              </div>
              <span className="w-8 text-right text-muted-foreground">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dimension averages */}
      {hasDimensionData ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-heading text-lg font-semibold">O'lchovlar bo'yicha baho</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Mijozlar so'rovnomasidan o'rtacha ko'rsatkichlar.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {dimensionAverages.map((d) => (
              <div key={d.slug} className="rounded-lg border border-border bg-background p-4">
                <div className="text-sm text-muted-foreground">{d.label}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-heading text-2xl font-semibold">{d.avg.toFixed(1)}</span>
                  <Stars value={Math.round(d.avg)} />
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-foreground" style={{ width: `${(d.avg / 5) * 100}%` }} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{d.count} ta baho</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Review list */}
      <div className="space-y-3">
        {reviews.map((r) => {
          const replyText = sentReplyByReview[r.id] || r.barber_reply || "";
          return (
          <div key={r.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start gap-3">
              <UserAvatar src={r.avatar} name={r.client} className="size-10" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="font-medium text-sm">{r.client}</div>
                  <div className="text-xs text-muted-foreground">{r.date}</div>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="text-xs text-muted-foreground">· {r.service}</span>
                </div>
                <p className="mt-2 text-sm text-foreground/90">{r.text}</p>
                {r.dimensions && r.dimensions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                    {r.dimensions.map((d) => (
                      <div key={d.dimension} className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {BARBER_DIMENSION_LABELS[d.dimension] ?? d.dimension}
                        </span>
                        <Stars value={d.score} size={3} />
                      </div>
                    ))}
                  </div>
                ) : null}
                {replyText ? (
                  <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                    <span className="font-medium text-muted-foreground">Javobingiz: </span>
                    {replyText}
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={replyByReview[r.id] || ""}
                      onChange={(e) => setReplyByReview((p) => ({ ...p, [r.id]: e.target.value }))}
                      placeholder="Sharhga javob yozing..."
                      className="flex-1 h-9 px-3 rounded-lg bg-muted border border-transparent focus:border-border focus:bg-background outline-none text-sm"
                    />
                    <button
                      onClick={async () => {
                        const reply = (replyByReview[r.id] || "").trim();
                        if (!reply) return;
                        const res = await apiFetch(`/api/v1/reviews/${r.id}/reply/`, {
                          method: "POST",
                          body: JSON.stringify({ reply }),
                        });
                        if (res.ok) {
                          toast.success("Javob yuborildi.");
                          setReplyByReview((p) => ({ ...p, [r.id]: "" }));
                          setSentReplyByReview((p) => ({ ...p, [r.id]: reply }));
                        } else {
                          toast.error("Javob yuborilmadi.");
                        }
                      }}
                      className="h-9 px-3 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90"
                    >
                      Yuborish
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
}
