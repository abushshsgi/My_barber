import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BarberMockPreview } from "@/components/barber-consult/BarberMockPreview";
import { BookingModal } from "@/components/barber-consult/BookingModal";
import { cameraStateFromUi, MasterCardUI } from "@/components/barber-consult/MasterCardUI";
import { MasterCardSkeleton } from "@/components/barber-consult/MasterCardSkeleton";
import { generateAiStyleTryOnViews, generateBarberMasterCard } from "@/lib/api/ai";
import type { ExploreViewId } from "@/lib/explore-views";
import {
  loadBarberConsultDraft,
  stashBarberConsultDraft,
} from "@/lib/barber-consult-session";
import { loadFaceProfile } from "@/lib/face-profile";
import { MorphPlanLimitError } from "@/lib/morph-plan-limit";
import {
  defaultBarberMasterCard,
  parseBarberMasterCard,
  zonesFromMasterCard,
  type BarberMasterCard,
} from "@/types/barber-master-card";

function hasUserMultiView(gallery: Partial<Record<ExploreViewId, string>> | undefined): boolean {
  if (!gallery?.front) return false;
  return Boolean(gallery.left && gallery.right && gallery.back);
}

function toApiStyleId(styleId: string): string {
  const raw = (styleId || "").trim();
  if (!raw) return "";
  if (raw.startsWith("men-") || raw.startsWith("women-")) return raw;
  return `men-${raw}`;
}

export function MorphAiConsultPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ from: "/ai-style_/consult" });
  const previewMode = search.preview === "barber";

  const draft = useMemo(() => loadBarberConsultDraft(), []);
  const image = draft?.image || "";
  const styleName = draft?.styleName || search.styleName || "Custom cut";
  const styleId = draft?.styleId || search.styleId || "";
  const apiStyleId = toApiStyleId(styleId);

  const [gallery, setGallery] = useState<Partial<Record<ExploreViewId, string>>>(() => {
    if (draft?.gallery && Object.keys(draft.gallery).length) return draft.gallery;
    return image ? { front: image } : {};
  });
  const [card, setCard] = useState<BarberMasterCard | null>(null);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ExploreViewId>("front");
  const [viewerMode, setViewerMode] = useState<"2d" | "3d">("2d");
  const [bookOpen, setBookOpen] = useState(false);

  const loadCard = async () => {
    if (!image) {
      setError(t("barberConsult.noImage", { defaultValue: "Try-on yoki uslub rasmi topilmadi." }));
      setLoading(false);
      setCard(defaultBarberMasterCard(styleName));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await generateBarberMasterCard({ image, style_name: styleName });
      const parsed = parseBarberMasterCard(res.master_card, styleName);
      const profile = loadFaceProfile();
      const nextCard = parsed.card;
      if (profile?.faceShapeKey) {
        nextCard.style_overview = {
          ...nextCard.style_overview,
          face_shape: profile.faceShapeKey,
        };
      }
      setCard(nextCard);
      setFallback(Boolean(res.fallback) || !parsed.success);
    } catch (err) {
      if (err instanceof MorphPlanLimitError) {
        setError(err.message);
        toast.error(err.message);
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : t("barberConsult.loadFailed", { defaultValue: "Master Card yuklanmadi" });
        setError(msg);
        setCard(defaultBarberMasterCard(styleName));
        setFallback(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMultiView = async () => {
    if (!image || !apiStyleId) return;
    if (hasUserMultiView(gallery)) return;

    setViewsLoading(true);
    try {
      const res = await generateAiStyleTryOnViews({
        image,
        style_id: apiStyleId,
      });
      const views = res.views || {};
      const next: Partial<Record<ExploreViewId, string>> = {
        front: views.front || res.preview_image || image,
        left: views.left,
        right: views.right,
        back: views.back,
      };
      setGallery(next);
      stashBarberConsultDraft({
        image: next.front || image,
        styleId,
        styleName,
        personaId: draft?.personaId,
        salonId: draft?.salonId,
        gallery: next,
      });
      toast.success(
        t("barberConsult.multiviewReady", {
          defaultValue: "360° ko‘rinishlar tayyor — Old / Chap / O‘ng / Orqa",
        }),
      );
    } catch (err) {
      if (err instanceof MorphPlanLimitError) {
        toast.error(err.message);
      } else {
        toast.message(
          t("barberConsult.multiviewFailed", {
            defaultValue: "360° hozir yaratilmadi — old try-on ko‘rsatilmoqda",
          }),
        );
      }
    } finally {
      setViewsLoading(false);
    }
  };

  useEffect(() => {
    void loadCard();
    void loadMultiView();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per draft
  }, []);

  const zones = card ? zonesFromMasterCard(card) : { sides: true, top: true, beard: false };
  const cameraState = cameraStateFromUi(activeView, viewerMode);
  const previewImage = gallery.front || image;

  if (!draft && !image) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          {t("barberConsult.empty", {
            defaultValue: "Avval try-on qiling, keyin Barber Consult ochiladi.",
          })}
        </p>
        <Link
          to="/ai-style"
          className="mt-4 inline-flex min-h-11 items-center rounded-2xl bg-foreground px-4 text-sm font-bold text-background"
        >
          {t("barberConsult.goAiStyle", { defaultValue: "Morf AI ga o‘tish" })}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => void navigate({ to: "/ai-style" })}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-sm font-bold"
        >
          <ArrowLeft className="size-4" />
          {t("common.back", { defaultValue: "Orqaga" })}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadMultiView()}
            disabled={viewsLoading || !apiStyleId}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-neutral-100 px-3 text-[12px] font-bold ring-1 ring-border disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${viewsLoading ? "animate-spin" : ""}`} />
            {t("barberConsult.multiviewRetry", { defaultValue: "360° qayta" })}
          </button>
          <button
            type="button"
            onClick={() => void loadCard()}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-neutral-100 px-3 text-[12px] font-bold ring-1 ring-border"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            {t("barberConsult.retry", { defaultValue: "Qayta yaratish" })}
          </button>
        </div>
      </div>

      <header className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
          Morf AI
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("barberConsult.title", { defaultValue: "Hair Trends & AI Barber Consult" })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("barberConsult.subtitle", {
            defaultValue: "360° preview + texnik Barber Master Card",
          })}
        </p>
        {viewsLoading ? (
          <p className="mt-2 text-[12px] font-semibold text-sky-700">
            {t("barberConsult.multiviewLoading", {
              defaultValue: "AI sizning yuzingizdan chap / o‘ng / orqa 360° yaratmoqda…",
            })}
          </p>
        ) : null}
      </header>

      {loading ? <MasterCardSkeleton /> : null}

      {!loading && card ? (
        <>
          <MasterCardUI
            card={card}
            previewImage={previewImage}
            gallery={gallery}
            activeView={activeView}
            onViewChange={setActiveView}
            zones={zones}
            viewerMode={viewerMode}
            onViewerModeChange={setViewerMode}
            onBook={() => setBookOpen(true)}
            fallbackUsed={fallback}
          />

          {error ? (
            <p className="mt-3 text-[12px] font-medium text-amber-800">{error}</p>
          ) : null}

          {(previewMode || search.preview === "barber") && (
            <div className="mt-6">
              <BarberMockPreview
                card={card}
                previewImage={previewImage}
                cameraState={cameraState}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              void navigate({
                to: "/ai-style/consult",
                search: {
                  styleId: search.styleId,
                  styleName: search.styleName,
                  preview: previewMode ? undefined : "barber",
                },
              })
            }
            className="mt-4 text-[12px] font-bold underline-offset-2 hover:underline"
          >
            {previewMode
              ? t("barberConsult.hideBarberPreview", { defaultValue: "Barber previewni yashirish" })
              : t("barberConsult.showBarberPreview", {
                  defaultValue: "Barber dashboard preview",
                })}
          </button>

          <BookingModal
            open={bookOpen}
            onOpenChange={setBookOpen}
            card={card}
            previewImage={previewImage}
            cameraState={cameraState}
            preferredSalonId={draft?.salonId}
          />
        </>
      ) : null}
    </div>
  );
}
