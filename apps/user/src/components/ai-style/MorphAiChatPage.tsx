import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Morph AI chatbot — placeholder until chat product ships. */
export function MorphAiChatPage() {
  const { t } = useTranslation();

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-[#050505] px-5 text-white lg:min-h-0"
      style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center pb-24 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
          <MessageCircle className="size-6 text-white/80" strokeWidth={1.75} />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          {t("aiStylePage.chat.title", { defaultValue: "AI Chatbot" })}
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/50">
          {t("aiStylePage.chat.comingSoon", {
            defaultValue: "Tez orada — soch, parvarish va uslub bo‘yicha AI yordamchi.",
          })}
        </p>
      </div>
    </div>
  );
}
