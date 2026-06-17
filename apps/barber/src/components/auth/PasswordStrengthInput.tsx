import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getPasswordStrength } from "@/lib/auth-ui";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  showStrength?: boolean;
  required?: boolean;
};

export function PasswordStrengthInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  showStrength = false,
  required,
}: Props) {
  const [show, setShow] = useState(false);
  const has = value.length > 0;
  const strength = getPasswordStrength(value);

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          className="peer h-14 w-full rounded-xl border border-border bg-background px-3.5 pt-5 pb-1.5 pr-10 text-base text-foreground outline-none transition-[var(--transition-smooth)] placeholder-transparent focus:border-foreground md:text-sm"
          placeholder={label}
        />
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute left-3.5 text-muted-foreground transition-[var(--transition-smooth)]",
            has
              ? "top-2 text-[10px] uppercase tracking-wider"
              : "top-1/2 -translate-y-1/2 text-sm",
            "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-foreground",
          )}
        >
          {label}
          {required && <span className="ml-0.5 text-foreground">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-[var(--transition-smooth)] hover:text-foreground"
          aria-label={show ? "Parolni yashirish" : "Parolni ko'rsatish"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showStrength && has && (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-300", strength.barClass)}
              style={{ width: `${strength.percent}%` }}
            />
          </div>
          <p className={cn("text-[11px] font-medium", strength.colorClass)}>{strength.label}</p>
        </div>
      )}
    </div>
  );
}
