import {
  formatSomDigits,
  formatSomInputDisplay,
  MIN_SERVICE_PRICE_UZS,
  parseSomDigits,
} from "@mybarber/shared/format";
import { cn } from "@/lib/utils";

type SomPriceInputProps = {
  value: string;
  onChange: (digits: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  compact?: boolean;
  /** FloatingInput uslubida qisqa yorliq */
  label?: string;
};

export function SomPriceInput({
  value,
  onChange,
  disabled,
  placeholder,
  className,
  id,
  compact,
  label,
}: SomPriceInputProps) {
  const display = formatSomDigits(value);

  return (
    <div className={cn(label && "space-y-1", className)}>
      {label ? (
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        disabled={disabled}
        placeholder={
          placeholder ?? formatSomInputDisplay(MIN_SERVICE_PRICE_UZS)
        }
        onChange={(event) => {
          onChange(event.target.value.replace(/\D/g, ""));
        }}
        className={cn(
          "w-full rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-70",
          compact ? "h-10 pr-14 pl-3" : "h-10 pr-14 pl-3",
        )}
      />
      <span
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
        aria-hidden
      >
        so&apos;m
      </span>
      </div>
    </div>
  );
}

export { parseSomDigits, validateServicePrice } from "@mybarber/shared/format";
