import { Loader2, Star } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReview } from "@/hooks/use-reviews-api";
import { cn } from "@/lib/utils";

type Props = {
  booking: {
    id: string;
    salonName: string;
    serviceName: string;
    barberName: string;
    hasReview?: boolean;
  };
};

export function BookingInlineReview({ booking }: Props) {
  const { t } = useTranslation();
  const createReview = useCreateReview();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");

  if (booking.hasReview) return null;

  const submit = async () => {
    if (rating < 1) {
      toast.error(t("bookings.reviewRatingRequired", { defaultValue: "Yulduz baho tanlang." }));
      return;
    }
    try {
      await createReview.mutateAsync({
        booking: parseInt(booking.id, 10),
        rating,
        text: text.trim(),
      });
      toast.success(t("bookings.reviewSuccess", { defaultValue: "Sharhingiz yuborildi!" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sharh yuborilmadi");
    }
  };

  return (
    <div className="rounded-[24px] border border-border bg-background p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]">
      <h2 className="mb-1 text-base font-bold">{t("bookings.writeReview")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {booking.salonName} · {booking.serviceName}
      </p>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const value = i + 1;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className="rounded-lg p-1"
            >
              <Star
                className={cn(
                  "size-8 transition-colors",
                  value <= rating ? "fill-foreground text-foreground" : "text-border",
                )}
              />
            </button>
          );
        })}
      </div>
      <Textarea
        className="mt-4 min-h-[88px] rounded-2xl"
        placeholder={t("bookings.reviewPlaceholder", { defaultValue: "Tajribangiz haqida yozing…" })}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        disabled={createReview.isPending}
        onClick={() => void submit()}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background disabled:opacity-60"
      >
        {createReview.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {t("bookings.submitReview", { defaultValue: "Sharh yuborish" })}
      </button>
    </div>
  );
}
