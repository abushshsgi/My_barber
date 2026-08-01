import { Cuboid, Scissors } from "lucide-react";

type MasterCardJson = {
  style_overview?: {
    name?: string;
    category?: string;
    face_shape?: string;
  };
  sides_and_back?: {
    fade_type?: string;
    starting_guard?: number;
    transition_guard?: number;
    neckline?: string;
  };
  top_section?: {
    estimated_length_cm?: number;
    cutting_technique?: string;
    texturizing_level?: string;
    styling_product?: string;
  };
  beard_and_facial_hair?: {
    present?: boolean;
    style?: string;
    cheek_line?: string;
    length_mm?: number;
  };
  notes_for_barber?: string;
};

type CameraState = {
  view?: string;
  mode?: string;
};

type Props = {
  masterCardJson?: MasterCardJson | Record<string, unknown> | null;
  stylePreviewUrl?: string | null;
  viewerCameraState?: CameraState | Record<string, unknown> | null;
};

function asCard(value: Props["masterCardJson"]): MasterCardJson | null {
  if (!value || typeof value !== "object") return null;
  return value as MasterCardJson;
}

export function MasterCardPanel({
  masterCardJson,
  stylePreviewUrl,
  viewerCameraState,
}: Props) {
  const card = asCard(masterCardJson);
  const preview = (stylePreviewUrl || "").trim();
  const camera = (viewerCameraState || {}) as CameraState;

  if (!card && !preview) return null;

  const overview = card?.style_overview;
  const sides = card?.sides_and_back;
  const top = card?.top_section;
  const beard = card?.beard_and_facial_hair;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <Scissors className="size-4 text-foreground" />
        <p className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
          Morf AI Master Card
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[5.5rem_1fr]">
        {preview ? (
          <img
            src={preview}
            alt=""
            className="aspect-[3/4] w-full rounded-xl object-cover ring-1 ring-border"
          />
        ) : (
          <div className="grid aspect-[3/4] place-items-center rounded-xl bg-muted">
            <Cuboid className="size-6 text-muted-foreground" />
          </div>
        )}
        <div className="space-y-1.5 text-[13px]">
          <p className="font-bold text-foreground">{overview?.name || "Custom cut"}</p>
          <p className="text-[12px] text-muted-foreground">
            {[overview?.category, overview?.face_shape].filter(Boolean).join(" · ")}
          </p>
          {camera.view || camera.mode ? (
            <p className="text-[11px] text-muted-foreground">
              View: {camera.view || "front"} / {camera.mode || "2d"}
            </p>
          ) : null}
          {sides ? (
            <p>
              Fade: {sides.fade_type} ({sides.starting_guard}–{sides.transition_guard} mm) ·{" "}
              {sides.neckline}
            </p>
          ) : null}
          {top ? (
            <p>
              Top: {top.estimated_length_cm} cm · {top.cutting_technique} · {top.texturizing_level}
            </p>
          ) : null}
          {beard?.present ? (
            <p>
              Beard: {beard.style || "—"} · {beard.length_mm ?? 0} mm
            </p>
          ) : null}
          {card?.notes_for_barber ? (
            <p className="rounded-lg bg-muted/60 px-2 py-1.5 text-[12px]">{card.notes_for_barber}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
