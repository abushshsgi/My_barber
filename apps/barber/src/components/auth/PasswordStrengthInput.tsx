import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { AUTH_INPUT_CLASS } from "@/lib/auth-desktop-variant";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
};

export function PasswordStrengthInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: Props) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const has = value.length > 0;
  const floatLabel = has || focused;
  const hint = placeholder ?? label;

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        required={required}
        className={cn(
          AUTH_INPUT_CLASS,
          "pr-11",
          floatLabel ? "placeholder-transparent" : "!py-3.5 placeholder:text-muted-foreground/55",
        )}
        placeholder={hint}
      />
      {floatLabel ? (
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {label}
          {required && <span className="text-destructive">*</span>}
        </label>
      ) : null}
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={show ? "Parolni yashirish" : "Parolni ko'rsatish"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
