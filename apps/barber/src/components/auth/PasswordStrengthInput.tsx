import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useAuthAccent } from "@/components/auth/AuthAccentContext";
import { ACCENT_INPUT_FOCUS } from "@/lib/auth-desktop-variant";
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
  const accent = useAuthAccent();
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
          className={cn(
            "peer h-[52px] w-full rounded-xl border border-transparent bg-white px-3.5 pt-5 pb-1.5 pr-11 text-base text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-all placeholder-transparent focus:bg-white md:text-sm",
            ACCENT_INPUT_FOCUS[accent],
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
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={show ? "Parolni yashirish" : "Parolni ko'rsatish"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showStrength && has && (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
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
