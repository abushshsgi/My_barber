import { CalendarPlus, Loader2, Share2, Cuboid, Images } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { HeadViewer } from "@/components/barber-consult/HeadViewer";
import { MultiAngleViewer } from "@/components/barber-consult/MultiAngleViewer";
import type { ExploreViewId } from "@/lib/explore-views";
import type {
  BarberMasterCard,
  MasterCardZoneKey,
  MasterCardZones,
  ViewerCameraState,
} from "@/types/barber-master-card";
import { cn } from "@/lib/utils";

type Props = {
  card: BarberMasterCard;
  previewImage: string;
  gallery?: Partial<Record<ExploreViewId, string>>;
  activeView: ExploreViewId;
  onViewChange: (view: ExploreViewId) => void;
  zones: MasterCardZones;
  viewerMode: "2d" | "3d";
  onViewerModeChange: (mode: "2d" | "3d") => void;
  onBook: () => void;
  fallbackUsed?: boolean;
  className?: string;
};

function RecipeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-white/70 px-3 py-2.5 ring-1 ring-black/5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{label}</span>
      <span className="text-right text-[13px] font-bold text-foreground">{value}</span>
    </div>
  );
}

export function MasterCardUI({
  card,
  previewImage,
  gallery,
  activeView,
  onViewChange,
  zones,
  viewerMode,
  onViewerModeChange,
  onBook,
  fallbackUsed,
  className,
}: Props) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeZone, setActiveZone] = useState<MasterCardZoneKey | null>(null);
  const [sharing, setSharing] = useState(false);
  const [force2d, setForce2d] = useState(false);

  const mode = force2d ? "2d" : viewerMode;
  const sides = card.sides_and_back;
  const top = card.top_section;
  const beard = card.beard_and_facial_hair;

  const handleShare = async () => {
    const node = cardRef.current;
    if (!node) return;
    setSharing(true);
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(node, { pixelRatio: 2, cacheBust: true });
      if (!blob) throw new Error("export failed");
      const file = new File([blob], "morf-ai-master-card.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: card.style_overview.name,
          text: t("barberConsult.shareText", {
            defaultValue: "Morf AI Barber Master Card",
          }),
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "morf-ai-master-card.png";
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t("barberConsult.shareSaved", { defaultValue: "Master Card saqlandi" }));
      }
    } catch {
      toast.error(t("barberConsult.shareFailed", { defaultValue: "Ulashib bo‘lmadi" }));
    } finally {
      setSharing(false);
    }
  };

  return (
    <div ref={cardRef} className={cn("space-y-4", className)}>
      {fallbackUsed ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-900 ring-1 ring-amber-200">
          {t("barberConsult.fallbackNotice", {
            defaultValue: "AI javobi to‘liq emas — xavfsiz fallback retsept ko‘rsatilmoqda.",
          })}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onViewerModeChange("2d")}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold",
            mode === "2d" ? "bg-foreground text-background" : "bg-neutral-100 ring-1 ring-border",
          )}
        >
          <Images className="size-3.5" />
          {t("barberConsult.mode2d", { defaultValue: "Multi-angle" })}
        </button>
        <button
          type="button"
          onClick={() => {
            setForce2d(false);
            onViewerModeChange("3d");
          }}
          disabled={force2d}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold",
            mode === "3d" ? "bg-foreground text-background" : "bg-neutral-100 ring-1 ring-border",
            force2d && "opacity-50",
          )}
        >
          <Cuboid className="size-3.5" />
          {t("barberConsult.mode3d", { defaultValue: "3D" })}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {mode === "3d" ? (
          <HeadViewer
            activeView={activeView}
            onViewChange={onViewChange}
            zones={zones}
            activeZone={activeZone}
            onZoneChange={setActiveZone}
            previewImage={previewImage}
            onWebglError={() => {
              setForce2d(true);
              onViewerModeChange("2d");
              toast.message(
                t("barberConsult.webglFallback", {
                  defaultValue: "3D mavjud emas — multi-angle ko‘rsatilmoqda",
                }),
              );
            }}
          />
        ) : (
          <MultiAngleViewer
            images={gallery ?? { front: previewImage }}
            fallbackImage={previewImage}
            activeView={activeView}
            onViewChange={onViewChange}
            zones={zones}
            activeZone={activeZone}
            onZoneChange={setActiveZone}
          />
        )}

        <div className="rounded-2xl border border-border bg-gradient-to-br from-neutral-50 via-white to-neutral-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
            {t("barberConsult.prescription", { defaultValue: "Barber Master Card" })}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
            {card.style_overview.name}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {card.style_overview.category} · {card.style_overview.face_shape}
          </p>

          <div className="mt-4 space-y-2">
            <RecipeRow
              label={t("barberConsult.fields.fade", { defaultValue: "Fade" })}
              value={`${sides.fade_type} · #${sides.starting_guard}→#${sides.transition_guard} mm`}
            />
            <RecipeRow
              label={t("barberConsult.fields.neckline", { defaultValue: "Neckline" })}
              value={sides.neckline}
            />
            <RecipeRow
              label={t("barberConsult.fields.top", { defaultValue: "Top" })}
              value={`${top.estimated_length_cm} cm · ${top.cutting_technique}`}
            />
            <RecipeRow
              label={t("barberConsult.fields.texture", { defaultValue: "Texture" })}
              value={`${top.texturizing_level} · ${top.styling_product}`}
            />
            <RecipeRow
              label={t("barberConsult.fields.beard", { defaultValue: "Beard" })}
              value={
                beard.present
                  ? `${beard.style || "—"} · ${beard.length_mm} mm`
                  : t("barberConsult.fields.beardNone", { defaultValue: "None" })
              }
            />
          </div>

          {card.notes_for_barber ? (
            <p className="mt-3 rounded-xl bg-black/[0.03] px-3 py-2 text-[12px] text-neutral-700">
              {card.notes_for_barber}
            </p>
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onBook}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-foreground px-4 text-sm font-bold text-background touch-manipulation active:opacity-90"
            >
              <CalendarPlus className="size-4" />
              {t("barberConsult.bookCta", { defaultValue: "Book Barber Appointment" })}
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={sharing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 text-sm font-bold text-foreground touch-manipulation active:opacity-90"
            >
              {sharing ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
              {t("barberConsult.shareCta", { defaultValue: "Share with Barber" })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function cameraStateFromUi(
  view: ExploreViewId,
  mode: "2d" | "3d",
): ViewerCameraState {
  return { view, mode };
}
