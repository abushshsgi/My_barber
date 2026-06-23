import { useAuthAccent } from "@/components/auth/AuthAccentContext";
import { ACCENT_FOCUS_WITHIN, ACCENT_INPUT_FOCUS } from "@/lib/auth-desktop-variant";
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
  const accent = useAuthAccent();
  const digits = parseUzLocalPhone(value);
  const display = formatUzLocalPhone(digits);
  const has = display.length > 0;

  return (
    <div className="relative">
      <div
        className={cn(
          "flex h-[52px] w-full items-stretch overflow-hidden rounded-xl border border-transparent bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] transition-all focus-within:ring-2",
          ACCENT_FOCUS_WITHIN[accent],
          error && "ring-2 ring-destructive/30",
        )}
      >
        <span className="flex shrink-0 items-center border-r border-zinc-100 bg-zinc-50/80 pl-3.5 pr-2.5 text-sm font-semibold text-muted-foreground">
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
            className="peer h-full w-full bg-transparent px-3 pt-5 pb-1.5 text-base text-foreground outline-none placeholder-transparent md:text-sm"
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
