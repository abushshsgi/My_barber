import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ImagePlus, Loader2, Timer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Booking } from "@/components/barber/BarberContext";
import type { CompleteBookingOptions } from "@/lib/map-booking";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking;
  busy?: boolean;
  onConfirm: (options: CompleteBookingOptions) => void;
};

export function CompleteBookingDialog({ open, onOpenChange, booking, busy, onConfirm }: Props) {
  const [earlyFinish, setEarlyFinish] = useState(false);
  const [portfolioAllowed, setPortfolioAllowed] = useState(booking.portfolio_consent === true);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setEarlyFinish(false);
    setPortfolioAllowed(booking.portfolio_consent === true);
    setImage(null);
    setPreview(null);
  }, [open, booking.id, booking.portfolio_consent]);

  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const userDenied = booking.portfolio_consent === false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xizmatni tugatish</DialogTitle>
          <DialogDescription>
            {booking.client} · {booking.service}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted/40">
            <input
              type="checkbox"
              className="mt-1"
              checked={earlyFinish}
              onChange={(e) => setEarlyFinish(e.target.checked)}
            />
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Timer className="size-4" />
                Erta tugatish
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Rejadan oldin tugatilsa, haqiqiy vaqt qayd etiladi.
              </p>
            </div>
          </label>

          <div className="rounded-xl border border-border p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Camera className="size-4" />
              Natija rasmi
            </div>
            {preview ? (
              <img src={preview} alt="Natija" className="h-40 w-full rounded-lg object-cover" />
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted/30"
              >
                <ImagePlus className="size-6" />
                Rasm yuklash
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            />
            {preview ? (
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={() => inputRef.current?.click()}
              >
                Boshqa rasm tanlash
              </button>
            ) : null}
          </div>

          <label
            className={cn(
              "flex items-start gap-3 rounded-xl border border-border p-3",
              userDenied ? "opacity-60" : "cursor-pointer hover:bg-muted/40",
            )}
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={portfolioAllowed}
              disabled={userDenied}
              onChange={(e) => setPortfolioAllowed(e.target.checked)}
            />
            <div>
              <p className="text-sm font-medium">Portfolio'ga qo'yish</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {booking.portfolio_consent === true
                  ? "Mijoz ruxsat berdi"
                  : booking.portfolio_consent === false
                    ? "Mijoz rad etdi"
                    : "Mijoz hali javob bermagan"}
              </p>
            </div>
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Bekor
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onConfirm({
                early_finish: earlyFinish,
                portfolio_allowed: portfolioAllowed,
                result_image: image,
              })
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Tugatish
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
