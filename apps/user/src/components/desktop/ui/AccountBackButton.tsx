import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { navigateBack } from "@/lib/mobile-back";
import { cn } from "@/lib/utils";

type Props = {
  /** Default: /profile — hisob hubiga qaytish. */
  to?: string;
  /** true: har doim `to` ga (tarix emas). Hisob sahifalari uchun default. */
  strict?: boolean;
  label?: string;
  className?: string;
};

/** Desktop hisob ichki sahifalari — Orqaga (odatda /profile). */
export function AccountBackButton({
  to = "/profile",
  strict = true,
  label,
  className,
}: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const text = label ?? t("common.back", { defaultValue: "Orqaga" });

  return (
    <button
      type="button"
      onClick={() => navigateBack(router, to, strict)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg py-1.5 text-sm font-semibold text-foreground transition-colors hover:opacity-80",
        className,
      )}
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={2} />
      {text}
    </button>
  );
}
