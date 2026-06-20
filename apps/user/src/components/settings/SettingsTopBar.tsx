import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

type Props = {
  backTo?: string;
  backLabel: string;
  doneLabel: string;
  className?: string;
};

export function SettingsTopBar({ backTo = "/profile", backLabel, doneLabel, className }: Props) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-4">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 rounded-lg py-1.5 text-sm font-semibold text-foreground transition-colors hover:opacity-80"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          {backLabel}
        </Link>
        <Link
          to="/profile"
          className="text-sm font-semibold text-foreground underline underline-offset-2 hover:opacity-80"
        >
          {doneLabel}
        </Link>
      </div>
    </div>
  );
}
