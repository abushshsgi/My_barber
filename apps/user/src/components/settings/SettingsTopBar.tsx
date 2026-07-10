import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { navigateBack } from "@/lib/mobile-back";

type Props = {
  backTo?: string;
  backLabel: string;
  doneLabel: string;
  className?: string;
};

export function SettingsTopBar({ backTo = "/profile", backLabel, doneLabel, className }: Props) {
  const router = useRouter();

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigateBack(router, backTo, true)}
          className="inline-flex items-center gap-1.5 rounded-lg py-1.5 text-sm font-semibold text-foreground transition-colors hover:opacity-80"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          {backLabel}
        </button>
        <button
          type="button"
          onClick={() => void router.navigate({ to: "/profile" })}
          className="text-sm font-semibold text-foreground underline underline-offset-2 hover:opacity-80"
        >
          {doneLabel}
        </button>
      </div>
    </div>
  );
}
