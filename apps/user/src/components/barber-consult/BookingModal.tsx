import { Link } from "@tanstack/react-router";
import { CalendarPlus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MorphNearbySalons } from "@/components/ai-style/MorphNearbySalons";
import { stashMasterCardForBooking } from "@/lib/barber-consult-session";
import { toShareImageSource } from "@/lib/media-url";
import type { BarberMasterCard, ViewerCameraState } from "@/types/barber-master-card";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: BarberMasterCard;
  previewImage: string;
  cameraState: ViewerCameraState;
  preferredSalonId?: string | null;
};

export function BookingModal({
  open,
  onOpenChange,
  card,
  previewImage,
  cameraState,
  preferredSalonId,
}: Props) {
  const { t } = useTranslation();

  const persistStash = () => {
    stashMasterCardForBooking({
      master_card_json: card,
      style_preview_url:
        previewImage.startsWith("http") || previewImage.startsWith("data:")
          ? previewImage
          : toShareImageSource(previewImage) || previewImage,
      viewer_camera_state: cameraState,
      style_name: card.style_overview.name,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("barberConsult.booking.title", { defaultValue: "Book with Master Card" })}
          </DialogTitle>
          <DialogDescription>
            {t("barberConsult.booking.desc", {
              defaultValue:
                "Salon tanlang — 3D/multi-angle preview va texnik retsept bronga biriktiriladi.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border bg-neutral-50 p-3">
          <p className="text-[12px] font-bold text-foreground">{card.style_overview.name}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {card.sides_and_back.fade_type} fade · {card.top_section.cutting_technique} · view{" "}
            {cameraState.view}
          </p>
        </div>

        <div
          onClickCapture={persistStash}
          onKeyDownCapture={(e) => {
            if (e.key === "Enter" || e.key === " ") persistStash();
          }}
        >
          <MorphNearbySalons preferredSalonId={preferredSalonId || undefined} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            to="/map"
            onClick={persistStash}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-foreground px-4 text-sm font-bold text-background"
          >
            <CalendarPlus className="size-4" />
            {t("barberConsult.booking.openMap", { defaultValue: "Salon tanlash" })}
          </Link>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border px-4 text-sm font-bold"
          >
            <X className="size-4" />
            {t("common.close", { defaultValue: "Yopish" })}
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          {t("barberConsult.booking.hint", {
            defaultValue:
              "Bron yaratilganda Master Card JSON avtomatik yuboriladi. Barber dashboardda retsept ko‘rinadi.",
          })}
        </p>
      </DialogContent>
    </Dialog>
  );
}
