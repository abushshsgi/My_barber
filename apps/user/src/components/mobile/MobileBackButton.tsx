import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const mobileBackButtonClass =
  "grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface active:scale-95";

type Props = {
  onClick: () => void;
  className?: string;
  "aria-label"?: string;
};

/** Mobil sahifalar uchun bir xil orqaga tugmasi. */
export function MobileBackButton({ onClick, className, "aria-label": ariaLabel = "Orqaga" }: Props) {
  return (
    <button type="button" onClick={onClick} className={cn(mobileBackButtonClass, className)} aria-label={ariaLabel}>
      <ChevronLeft className="size-5" strokeWidth={2.25} />
    </button>
  );
}
