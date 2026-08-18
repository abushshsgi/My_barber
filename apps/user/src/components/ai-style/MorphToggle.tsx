import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/** iOS 18 uslubidagi pill toggle — Morph AI sozlamalari uchun. */
export function MorphToggle({ checked, onCheckedChange, disabled, className }: Props) {
  return (
    <SwitchPrimitives.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full",
        "transition-colors duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1C1E]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "data-[state=checked]:bg-[#34C759] data-[state=unchecked]:bg-[#3A3A3C]",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.18)]"
      />
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block size-[27px] rounded-full bg-white",
          "shadow-[0_1px_2px_rgba(0,0,0,0.28),0_3px_8px_rgba(0,0,0,0.18)]",
          "transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px]",
        )}
      />
    </SwitchPrimitives.Root>
  );
}
