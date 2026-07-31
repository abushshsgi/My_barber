import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { fetchMorphAiLookShare, registerMorphAiLookShareView } from "@/lib/api";
import { hasValidUserSession } from "@/lib/api/client";
import { getAiStyleHeroUrl } from "@/lib/cover-images";
import { trackMorphShare } from "@/lib/ga";

type Props = {
  shareId: string;
};

const HEADLINE_KEYS = [
  "personalHeadlineName",
  "personalHeadlineLook",
  "personalHeadlineFresh",
  "personalHeadlineGlow",
] as const;

const SUBTITLE_KEYS = [
  "personalSubtitleResult",
  "personalSubtitleTry",
  "personalSubtitleViral",
] as const;

function pickVariant<T extends string>(keys: readonly T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return keys[hash % keys.length] ?? keys[0];
}

/**
 * Public viral landing — result image only (no before/after).
 * Personalized marketing copy with sharer's name.
 */
export function MorphPersonalShareLanding({ shareId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["morph-look-share", shareId],
    queryFn: () => fetchMorphAiLookShare(shareId),
    staleTime: 60_000,
  });

  const title =
    data?.title || t("aiStylePage.shareLook.defaultTitle", { defaultValue: "Yangi uslub" });
  const styleId = data?.style_id || "";
  const tryPath = styleId ? `/explore/${encodeURIComponent(styleId)}/try` : "/ai-style";
  const name =
    (data?.sharer_name || "").trim() ||
    t("aiStylePage.shareLook.defaultSharer", { defaultValue: "Do‘stingiz" });

  const headlineKey = useMemo(() => pickVariant(HEADLINE_KEYS, shareId), [shareId]);
  const subtitleKey = useMemo(() => pickVariant(SUBTITLE_KEYS, `${shareId}:sub`), [shareId]);

  const headlineDefaults: Record<(typeof HEADLINE_KEYS)[number], string> = {
    personalHeadlineName: "{{name}}ning yangi obrazi",
    personalHeadlineLook: "{{name}} Morf AI da yangilandi",
    personalHeadlineFresh: "{{name}}ning yangi uslubi",
    personalHeadlineGlow: "{{name}} — yangi look",
  };
  const subtitleDefaults: Record<(typeof SUBTITLE_KEYS)[number], string> = {
    personalSubtitleResult: "{{style}} — haqiqiy AI natija. Endi o‘zingizda ham sinab ko‘ring.",
    personalSubtitleTry: "{{name}} shu uslubni tanladi. Sizniki qanday chiqadi?",
    personalSubtitleViral: "10 soniyada o‘z selfiengizda ko‘ring — Morf AI.",
  };

  useEffect(() => {
    if (!shareId) return;
    trackMorphShare("landing_view", { surface: "landing", shareId });
    void registerMorphAiLookShareView(shareId).catch(() => {
      /* hisoblagich viral oqimni to‘xtatmasin */
    });
  }, [shareId]);

  const onTry = () => {
    trackMorphShare("landing_try_click", {
      surface: "landing",
      shareId,
      styleId,
      authed: hasValidUserSession(),
    });
    if (hasValidUserSession()) {
      if (styleId) {
        void navigate({ to: "/explore/$styleId/try", params: { styleId } });
      } else {
        void navigate({ to: "/ai-style" });
      }
      return;
    }
    void navigate({
      to: "/auth",
      search: { redirect: tryPath },
    });
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div
        className="mx-auto max-w-lg px-5 pb-2"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Wand2 className="h-3 w-3" />
          Morf AI
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 max-w-[20rem] text-[1.45rem] font-bold leading-[1.15] tracking-tight md:text-[1.65rem]"
        >
          {t(`aiStylePage.shareLook.${headlineKey}`, {
            name,
            defaultValue: headlineDefaults[headlineKey],
          })}
        </motion.h1>
        <p className="mt-1.5 max-w-[22rem] text-[13px] leading-relaxed text-muted-foreground">
          {t(`aiStylePage.shareLook.${subtitleKey}`, {
            style: title,
            name,
            defaultValue: subtitleDefaults[subtitleKey],
          })}
        </p>
      </div>

      <div className="mx-auto max-w-lg space-y-3 px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3">
        {isLoading ? (
          <div className="flex aspect-[3/4] w-full items-center justify-center rounded-2xl bg-surface">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : isError || !data?.after_url ? (
          <div className="rounded-2xl border border-border bg-surface px-5 py-9 text-center">
            <p className="text-[15px] font-semibold">
              {t("aiStylePage.shareLook.notFound", {
                defaultValue: "Bu ulashish topilmadi yoki o‘chirilgan",
              })}
            </p>
            <Link
              to="/ai-style"
              className="mt-4 inline-flex rounded-full bg-foreground px-5 py-2.5 text-[13px] font-bold text-background"
            >
              Morf AI
            </Link>
          </div>
        ) : (
          <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-surface">
            <img
              src={data.after_url || getAiStyleHeroUrl("hero-men")}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3.5 pb-3.5 pt-10">
              <p className="text-[13px] font-bold text-white">{title}</p>
              <p className="mt-0.5 text-[11px] font-medium text-white/70">{name}</p>
            </div>
          </div>
        )}

        {!isLoading && data?.after_url ? (
          <>
            <button
              type="button"
              onClick={onTry}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-foreground text-[13px] font-bold text-background touch-manipulation active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              {t("aiStylePage.shareLook.cta", { defaultValue: "O‘zimda sinab ko‘rish" })}
            </button>
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              {t("aiStylePage.shareLook.authHint", {
                defaultValue:
                  "Davom etish uchun tezkor ro‘yxatdan o‘tasiz — keyin to‘g‘ridan-to‘g‘ri Morf AI try-on ochiladi.",
              })}
            </p>
            <Link
              to="/"
              className="block text-center text-[13px] font-semibold text-muted-foreground underline-offset-4 hover:underline"
            >
              {t("aiStylePage.shareLook.browseHome", { defaultValue: "Avval salonlarni ko‘rish" })}
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
