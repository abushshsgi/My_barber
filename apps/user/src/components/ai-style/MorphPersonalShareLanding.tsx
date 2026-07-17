import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MorphBeforeAfter } from "@/components/ai-style/MorphBeforeAfter";
import { fetchMorphAiLookShare } from "@/lib/api";
import { hasValidUserSession } from "@/lib/api/client";
import { getAiStyleHeroUrl } from "@/lib/cover-images";

type Props = {
  shareId: string;
};

/**
 * Public viral landing for a user's personal before/after share.
 * CTA → try-on for the shared style; guests auth first with redirect.
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

  const onTry = () => {
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
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white">
      <div
        className="px-5 pb-2"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85 backdrop-blur-md">
          <Wand2 className="h-3.5 w-3.5" />
          Morf AI
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 max-w-[20rem] text-[1.85rem] font-bold leading-[1.08] tracking-tight"
        >
          {t("aiStylePage.shareLook.personalHeadline", {
            defaultValue: "Do‘stingizning before / after",
          })}
        </motion.h1>
        <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-white/70">
          {t("aiStylePage.shareLook.personalSubtitle", {
            style: title,
            defaultValue:
              "{{style}} — haqiqiy natija. Endi o‘zingizda ham sinab ko‘ring.",
          })}
        </p>
      </div>

      <div className="space-y-4 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
        {isLoading ? (
          <div className="flex aspect-[3/4] w-full max-w-md items-center justify-center rounded-[24px] bg-white/5">
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
          </div>
        ) : isError || !data?.after_url ? (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-5 py-10 text-center">
            <p className="text-base font-semibold">
              {t("aiStylePage.shareLook.notFound", {
                defaultValue: "Bu ulashish topilmadi yoki o‘chirilgan",
              })}
            </p>
            <Link
              to="/ai-style"
              className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
            >
              Morf AI
            </Link>
          </div>
        ) : data.before_url ? (
          <div className="mx-auto w-full max-w-md">
            <MorphBeforeAfter beforeSrc={data.before_url} afterSrc={data.after_url} title={title} />
          </div>
        ) : (
          <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-[24px]">
            <img
              src={data.after_url || getAiStyleHeroUrl("hero-men")}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12">
              <p className="text-sm font-bold">{title}</p>
            </div>
          </div>
        )}

        {!isLoading && data?.after_url ? (
          <>
            <button
              type="button"
              onClick={onTry}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-black touch-manipulation active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              {t("aiStylePage.shareLook.cta", { defaultValue: "O‘zimda sinab ko‘rish" })}
            </button>
            <p className="text-center text-[11px] leading-relaxed text-white/50">
              {t("aiStylePage.shareLook.authHint", {
                defaultValue:
                  "Davom etish uchun tezkor ro‘yxatdan o‘tasiz — keyin to‘g‘ridan-to‘g‘ri Morf AI try-on ochiladi.",
              })}
            </p>
            <Link
              to="/"
              className="block text-center text-sm font-semibold text-white/55 underline-offset-4 hover:underline"
            >
              {t("aiStylePage.shareLook.browseHome", { defaultValue: "Avval salonlarni ko‘rish" })}
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
