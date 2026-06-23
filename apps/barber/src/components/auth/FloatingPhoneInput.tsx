import { AUTH_PHONE_SHELL_CLASS } from "@/lib/auth-desktop-variant";
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
          AUTH_PHONE_SHELL_CLASS,
          error && "border-destructive/40 focus-within:border-destructive/50",
        )}
      >
        <span className="flex shrink-0 items-center border-r border-border/60 bg-white/50 px-3.5 text-sm font-semibold text-muted-foreground">
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
            className="peer h-full w-full bg-transparent px-3 pt-5 pb-1.5 text-base text-foreground outline-none ring-0 placeholder-transparent md:text-sm"
            placeholder={label}
          />
          <label
            htmlFor={id}
            className={cn(
              "pointer-events-none absolute left-3 text-muted-foreground transition-all",
              has ? "top-1.5 text-[10px] font-semibold uppercase tracking-wider" : "top-1/2 -translate-y-1/2 text-sm",
              "peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-wider",
            )}
          >
            {label}
          </label>
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
