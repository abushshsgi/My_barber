import { AUTH_INPUT_CLASS } from "@/lib/auth-desktop-variant";
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
          AUTH_INPUT_CLASS,
          error && "border-destructive/40 focus:border-destructive/55",
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
