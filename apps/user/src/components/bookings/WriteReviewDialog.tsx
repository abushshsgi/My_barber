import { Loader2, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReview } from "@/hooks/use-reviews-api";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    salonName: string;
    serviceName: string;
    barberName: string;
  };
};

export function WriteReviewDialog({ open, onOpenChange, booking }: Props) {
  const { t } = useTranslation();
  const createReview = useCreateReview();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open) return;
    setRating(0);
    setText("");
  }, [open, booking.id]);

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
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("bookings.reviewError", { defaultValue: "Sharh yuborilmadi." }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("bookings.reviewDialogTitle", { defaultValue: "Sharh yozish" })}</DialogTitle>
          <DialogDescription className="text-left">
            {booking.salonName} · {booking.serviceName} · {booking.barberName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="mb-2 text-sm font-semibold">
              {t("bookings.reviewRatingLabel", { defaultValue: "Bahongiz" })}
            </p>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const value = i + 1;
                const active = value <= rating;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value}`}
                    onClick={() => setRating(value)}
                    className="rounded-md p-1 transition-transform active:scale-95"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8",
                        active ? "fill-foreground text-foreground" : "text-border",
                      )}
                      strokeWidth={active ? 0 : 1.5}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="review-text" className="mb-2 block text-sm font-semibold">
              {t("bookings.reviewTextLabel", { defaultValue: "Fikringiz" })}
            </label>
            <Textarea
              id="review-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("bookings.reviewPlaceholder", {
                defaultValue: "Tashrifingiz qanday o'tdi? (ixtiyoriy)",
              })}
              rows={4}
              className="resize-none rounded-xl"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createReview.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={createReview.isPending || rating < 1}>
            {createReview.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                {t("common.loading")}
              </span>
            ) : (
              t("bookings.submitReview", { defaultValue: "Yuborish" })
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
