import { Store } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Ilovadagi MysaloonBlockedMessage — bron to‘xtatilgan. */
export function MysaloonPausedScreen() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
      <div className="grid size-20 place-items-center rounded-3xl border border-border bg-card">
        <Store className="size-10" strokeWidth={1.75} />
      </div>
      <h1 className="mt-6 max-w-xs text-xl font-extrabold tracking-tight">
        {t("comingSoon.title", { defaultValue: "Tez orada salonlar qo'shiladi" })}
      </h1>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
        {t("comingSoon.sub", {
          defaultValue: "Bron tizimi salonlar qo'shilgandan keyin ishga tushadi.",
        })}
      </p>
    </div>
  );
}
