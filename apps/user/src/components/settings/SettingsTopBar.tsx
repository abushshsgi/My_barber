import { useRouter } from "@tanstack/react-router";
import { MobileBackButton } from "@/components/mobile/MobileBackButton";
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
        <div className="flex min-w-0 items-center gap-2">
          <MobileBackButton
            onClick={() => navigateBack(router, backTo, true)}
            aria-label={backLabel}
          />
          <span className="truncate text-sm font-semibold text-foreground">{backLabel}</span>
        </div>
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
