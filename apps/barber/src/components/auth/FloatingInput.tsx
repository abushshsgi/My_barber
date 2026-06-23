import { useAuthAccent } from "@/components/auth/AuthAccentContext";
import { ACCENT_INPUT_FOCUS } from "@/lib/auth-desktop-variant";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string | null;
  onBlur?: () => void;
};

export function FloatingInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
  error,
  onBlur,
}: Props) {
  const accent = useAuthAccent();
  const has = value.length > 0;

  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={!!error}
        className={cn(
          "peer h-[52px] w-full rounded-xl border border-transparent bg-white px-3.5 pt-5 pb-1.5 text-base text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none ring-0 transition-all placeholder-transparent focus:border-transparent focus:bg-white md:text-sm",
          ACCENT_INPUT_FOCUS[accent],
          error && "ring-2 ring-destructive/30",
        )}
        placeholder={label}
      />
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-3.5 text-muted-foreground transition-all",
          has ? "top-1.5 text-[10px] font-semibold uppercase tracking-wider" : "top-1/2 -translate-y-1/2 text-sm",
          "peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-wider",
        )}
      >
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {error && <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
