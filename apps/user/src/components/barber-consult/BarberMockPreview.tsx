import { useTranslation } from "react-i18next";
import type { BarberMasterCard, ViewerCameraState } from "@/types/barber-master-card";

type Props = {
  card: BarberMasterCard;
  previewImage: string;
  cameraState: ViewerCameraState;
};

/** Mock of how the barber sees the incoming Master Card on their dashboard. */
export function BarberMockPreview({ card, previewImage, cameraState }: Props) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-950 p-4 text-white">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
        {t("barberConsult.barberPreview.badge", { defaultValue: "Barber dashboard preview" })}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[7rem_1fr]">
        <img
          src={previewImage}
          alt=""
          className="aspect-[3/4] w-full rounded-xl object-cover ring-1 ring-white/10"
        />
        <div>
          <h3 className="text-lg font-bold">{card.style_overview.name}</h3>
          <p className="text-[12px] text-white/60">
            {t("barberConsult.barberPreview.camera", {
              defaultValue: "Camera",
            })}
            : {cameraState.view} / {cameraState.mode}
          </p>
          <ul className="mt-2 space-y-1 text-[12px] text-white/85">
            <li>
              Fade: {card.sides_and_back.fade_type} ({card.sides_and_back.starting_guard}–
              {card.sides_and_back.transition_guard} mm)
            </li>
            <li>
              Top: {card.top_section.estimated_length_cm} cm · {card.top_section.cutting_technique}
            </li>
            <li>Neckline: {card.sides_and_back.neckline}</li>
            {card.beard_and_facial_hair.present ? (
              <li>
                Beard: {card.beard_and_facial_hair.style} · {card.beard_and_facial_hair.length_mm} mm
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
