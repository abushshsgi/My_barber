import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight, Sparkles, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useHairstyle } from "@/hooks/use-hairstyles";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { getHairstyleDisplayUrl } from "@/lib/hairstyles/catalog";
import { hasValidUserSession } from "@/lib/api/client";
import { getAiStyleHeroUrl } from "@/lib/cover-images";

type Props = {
  styleId: string;
};

/**
 * Public viral landing: shared Morf AI look.
 * CTA → try-on; guests go through /auth?redirect=… then land on try flow (Morf AI path).
 */
export function MorphLookShareLanding({ styleId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { personaId } = useExplorePersona();
  const { data: entry, isLoading } = useHairstyle(styleId, personaId);
  const title = entry?.titleUz || entry?.title || t("aiStylePage.shareLook.defaultTitle", { defaultValue: "Yangi uslub" });
  const image = entry ? getHairstyleDisplayUrl(entry) : getAiStyleHeroUrl("hero-men");

  const tryPath = `/explore/${encodeURIComponent(styleId)}/try`;

  const onTry = () => {
    if (hasValidUserSession()) {
      void navigate({ to: "/explore/$styleId/try", params: { styleId } });
      return;
    }
    void navigate({
      to: "/auth",
      search: { redirect: tryPath },
    });
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white">
      <div className="relative isolate min-h-[62dvh] overflow-hidden">
        <img
          src={image}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover object-top ${isLoading ? "opacity-40" : "opacity-90"}`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-[#0a0a0a]" />
        <div
          className="relative z-[1] flex min-h-[62dvh] flex-col justify-end px-5 pb-8"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85 backdrop-blur-md">
            <Wand2 className="h-3.5 w-3.5" />
            Morf AI
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 max-w-[18rem] text-[2rem] font-bold leading-[1.05] tracking-tight"
          >
            {t("aiStylePage.shareLook.headline", {
              defaultValue: "Bu uslub sizga ham yarashishi mumkin",
            })}
          </motion.h1>
          <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-white/70">
            {t("aiStylePage.shareLook.subtitle", {
              style: title,
              defaultValue:
                "{{style}} — do‘stingiz Morf AI da sinab ko‘rdi. Endi siz ham o‘z selfiengizda ko‘ring.",
            })}
          </p>
        </div>
      </div>

      <div className="space-y-4 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2">
        <div className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
            {t("aiStylePage.shareLook.styleLabel", { defaultValue: "Uslub" })}
          </p>
          <p className="mt-1 text-lg font-bold">{title}</p>
          <p className="mt-2 text-sm text-white/60">
            {t("aiStylePage.shareLook.pitch", {
              defaultValue:
                "Selfie yuklang — AI shu turmakni yuzingizda ko‘rsatadi. 10 soniyada natija.",
            })}
          </p>
        </div>

        <button
          type="button"
          onClick={onTry}
          className="flex w-full min-h-14 items-center justify-center gap-2 rounded-2xl bg-white text-base font-bold text-black touch-manipulation active:scale-[0.98]"
        >
          <Sparkles className="h-5 w-5" />
          {t("aiStylePage.shareLook.cta", { defaultValue: "O‘zimda sinab ko‘rish — Morf AI" })}
        </button>

        <Link
          to="/wallet"
          search={{ section: "subscriptions", plan: "starter", returnTo: "/ai-style" }}
          className="flex w-full min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 text-sm font-bold text-white/90 touch-manipulation"
        >
          <Wand2 className="h-4 w-4" />
          {t("aiStylePage.shareLook.unlockCta", {
            defaultValue: "Obuna bilan ochish — Starter",
          })}
        </Link>

        <p className="text-center text-[11px] text-white/45">
          {t("aiStylePage.shareLook.authHint", {
            defaultValue:
              "Davom etish uchun tezkor ro‘yxatdan o‘tasiz — keyin Morf AI try-on. 3 do‘st = 7 kun bepul.",
          })}
        </p>

        <Link
          to="/"
          className="flex items-center justify-center gap-1 py-3 text-sm font-bold text-white/70 touch-manipulation"
        >
          {t("aiStylePage.shareLook.browseHome", { defaultValue: "Avval salonlarni ko‘rish" })}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
