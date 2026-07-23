import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Droplets, ImagePlus, ScanFace, UserRound, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SubscriptionPromoBanner } from "@/components/subscriptions/SubscriptionPlanAds";
import { MorphLimitMeter } from "@/components/subscriptions/MorphLimitMeter";
import { MorphSoftPaywall } from "@/components/ai-style/MorphSoftPaywall";
import { useSubscriptionMe } from "@/hooks/use-subscription";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useHairstyles } from "@/hooks/use-hairstyles";
import { getHairstyleDisplayUrl } from "@/lib/hairstyles/catalog";
import {
  loadMorphAiGenerations,
  MORPH_AI_GALLERY_UPDATED_EVENT,
  refreshMorphAiGenerationsCache,
  type MorphAiGeneration,
} from "@/lib/morph-ai-gallery";
import { navigateBack } from "@/lib/mobile-back";
import type { Audience } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = {
  audience: Audience;
  onStartNew: () => void;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
  ensureMorphAccess?: () => Promise<boolean>;
};

function prettyLookTitle(title: string) {
  const raw = title.trim();
  if (!raw) return "Try-on";
  if (!/[-_]/.test(raw) && !/^(men|women)\b/i.test(raw)) return raw;
  return raw
    .replace(/^(men|women)[-_]/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function MorphAiHome({
  audience,
  onStartNew,
  onOpenCamera,
  onOpenGallery,
  ensureMorphAccess,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const meQ = useSubscriptionMe();
  const morphLocked = Boolean(meQ.data && !meQ.data.has_active);
  const { personaId } = useExplorePersona();
  const { data: styles = [], isLoading } = useHairstyles(
    audience === "women" ? "women" : "men",
    personaId,
    { ignoreAgeGroup: true },
  );
  const [generations, setGenerations] = useState<MorphAiGeneration[]>(() => loadMorphAiGenerations());

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const list = await refreshMorphAiGenerationsCache();
      if (!cancelled) setGenerations(list);
    };
    void refresh();
    const onUpdate = () => setGenerations(loadMorphAiGenerations());
    window.addEventListener(MORPH_AI_GALLERY_UPDATED_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(MORPH_AI_GALLERY_UPDATED_EVENT, onUpdate);
    };
  }, []);

  const samples = useMemo(() => styles.slice(0, 6), [styles]);
  const myLooks = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; title: string; image: string; styleId: string }[] = [];
    for (const g of generations) {
      if (!g.previewImage) continue;
      // Dedupe identical after images (same try-on saved multiple times).
      const fingerprint = `${g.styleId}::${g.previewImage.slice(0, 96)}`;
      if (seen.has(fingerprint) || seen.has(g.id)) continue;
      seen.add(fingerprint);
      seen.add(g.id);
      out.push({
        id: g.id,
        title: prettyLookTitle(g.title),
        image: g.previewImage,
        styleId: g.styleId,
      });
      if (out.length >= 8) break;
    }
    return out;
  }, [generations]);

  const openHistory = () => {
    void navigate({ to: "/ai-style/history" });
  };

  return (
    <div className="relative h-full min-h-0 touch-pan-y overflow-y-auto overscroll-y-contain bg-background text-foreground [-webkit-overflow-scrolling:touch]">
      <header
        className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/60 bg-background/95 px-4 backdrop-blur-md"
        style={{ paddingTop: "max(0.55rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() => navigateBack(router, "/")}
          className="grid size-9 place-items-center rounded-full active:bg-surface"
          aria-label={t("nav.home")}
        >
          <ChevronLeft className="size-5" strokeWidth={2.25} />
        </button>
        <p className="min-w-0 flex-1 text-center text-[12px] font-extrabold tracking-[0.18em]">
          {t("aiStylePage.title")}
        </p>
        <Link
          to="/profile"
          className="grid size-9 place-items-center rounded-full active:bg-surface"
          aria-label={t("nav.profile")}
        >
          <UserRound className="size-[17px]" strokeWidth={2} />
        </Link>
      </header>

      <div className="mx-auto w-full max-w-3xl px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-5 md:max-w-5xl md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h1 className="font-display text-[2.15rem] font-extrabold leading-none tracking-[-0.03em] md:text-[2.4rem]">
            MORF
          </h1>
          <p className="mt-1.5 max-w-[22rem] text-[13px] leading-snug text-muted-foreground md:text-[14px]">
            {t("aiStylePage.home.subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.35 }}
          className="mt-5 space-y-2"
        >
          <button
            type="button"
            onClick={onStartNew}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-foreground text-[14px] font-bold text-background active:scale-[0.99]"
          >
            {t("aiStylePage.home.newLook")}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenCamera}
              className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface text-[12px] font-bold active:scale-[0.99] md:text-[13px]"
            >
              <ScanFace className="size-3.5" strokeWidth={2} />
              {t("aiStylePage.openCamera")}
            </button>
            <button
              type="button"
              onClick={onOpenGallery}
              className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface text-[12px] font-bold active:scale-[0.99] md:text-[13px]"
            >
              <ImagePlus className="size-3.5" strokeWidth={2} />
              {t("aiStylePage.pickFromGallery")}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  if (ensureMorphAccess && !(await ensureMorphAccess())) return;
                  void navigate({ to: "/ai-style/studio" });
                })();
              }}
              className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface/70 px-2.5 text-[12px] font-bold active:scale-[0.99] md:text-[13px]"
            >
              <Wand2 className="size-3.5 shrink-0" strokeWidth={2} />
              <span className="min-w-0 truncate">{t("aiStylePage.home.tools.studio")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  if (ensureMorphAccess && !(await ensureMorphAccess())) return;
                  void navigate({ to: "/ai-style/care" });
                })();
              }}
              className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface/70 px-2.5 text-[12px] font-bold active:scale-[0.99] md:text-[13px]"
            >
              <Droplets className="size-3.5 shrink-0" strokeWidth={2} />
              <span className="min-w-0 truncate">{t("aiStylePage.home.tools.care")}</span>
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="mt-3.5 space-y-2.5"
        >
          {morphLocked ? <MorphSoftPaywall /> : <MorphLimitMeter />}
          {!morphLocked ? <SubscriptionPromoBanner /> : null}
        </motion.div>

        <section className="mt-7">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="text-[13px] font-bold md:text-[14px]">
              {t("aiStylePage.home.myLooksTitle")}
            </p>
            <button
              type="button"
              onClick={openHistory}
              className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-muted-foreground"
            >
              {t("aiStylePage.historyViewAll")}
              <ChevronRight className="size-3.5" />
            </button>
          </div>
          {myLooks.length > 0 ? (
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
              {myLooks.map((look) => (
                <button
                  key={look.id}
                  type="button"
                  onClick={openHistory}
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-surface active:opacity-85 md:h-[4.5rem] md:w-[4.5rem]"
                  aria-label={look.title}
                >
                  <img src={look.image} alt="" className="h-full w-full object-cover object-top" />
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={openHistory}
              className="w-full rounded-2xl border border-dashed border-border bg-surface/40 px-4 py-5 text-left"
            >
              <p className="text-[13px] font-semibold">
                {t("aiStylePage.historyEmpty")}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {t("aiStylePage.home.myLooksEmptyHint", {
                  defaultValue: "Try-on qiling — natijalar shu yerda va Historyda chiqadi",
                })}
              </p>
            </button>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("aiStylePage.home.samplesLabel")}
              </p>
              <h2 className="mt-0.5 text-[15px] font-bold md:text-[16px]">
                {t("aiStylePage.home.samplesTitle")}
              </h2>
            </div>
            <Link
              to="/explore"
              className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-muted-foreground"
            >
              {t("nav.explore")}
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-2.5">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "animate-pulse rounded-2xl bg-surface",
                      i === 0 ? "col-span-2 aspect-[16/10] md:col-span-1 md:aspect-[3/4]" : "aspect-[3/4]",
                    )}
                  />
                ))
              : samples.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * index, duration: 0.3 }}
                    className={cn(index === 0 && "col-span-2 md:col-span-1")}
                  >
                    <Link
                      to="/explore/$styleId"
                      params={{ styleId: entry.id }}
                      className="group relative block overflow-hidden rounded-2xl border border-border/60 bg-surface active:opacity-90"
                    >
                      <img
                        src={getHairstyleDisplayUrl(entry)}
                        alt=""
                        className={cn(
                          "w-full object-cover transition duration-500 group-active:scale-[1.02]",
                          index === 0
                            ? "aspect-[16/10] md:aspect-[3/4]"
                            : "aspect-[3/4]",
                        )}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-7">
                        <p className="truncate text-[12px] font-bold text-white md:text-[13px]">
                          {entry.titleUz || entry.title}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
          </div>
        </section>
      </div>
    </div>
  );
}
