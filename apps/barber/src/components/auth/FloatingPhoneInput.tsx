import { cn } from "@/lib/utils";
import { formatUzLocalPhone, parseUzLocalPhone } from "@/lib/phone";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  onBlur?: () => void;
};

export function FloatingPhoneInput({ id, label, value, onChange, error, onBlur }: Props) {
  const digits = parseUzLocalPhone(value);
  const display = formatUzLocalPhone(digits);
  const has = display.length > 0;

  return (
    <div className="relative">
      <div
        className={cn(
          "flex h-14 w-full items-stretch rounded-xl border bg-background transition-[var(--transition-smooth)] focus-within:border-foreground",
          error ? "border-destructive" : "border-border",
        )}
      >
        <span className="flex shrink-0 items-center border-r border-border pl-3.5 pr-2.5 text-sm font-medium text-muted-foreground">
          +998
        </span>
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            value={display}
            onChange={(e) => onChange(parseUzLocalPhone(e.target.value))}
            onBlur={onBlur}
            autoComplete="tel"
            aria-invalid={!!error}
            className="peer h-full w-full bg-transparent px-3 pt-5 pb-1.5 text-sm text-foreground outline-none placeholder-transparent"
            placeholder={label}
          />
          <label
            htmlFor={id}
            className={cn(
              "pointer-events-none absolute left-3 text-muted-foreground transition-[var(--transition-smooth)]",
              has
                ? "top-2 text-[10px] uppercase tracking-wider"
                : "top-1/2 -translate-y-1/2 text-sm",
              "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-foreground",
            )}
          >
            {label}
          </label>
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
