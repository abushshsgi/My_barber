import { userWebUrl } from "@mybarber/shared/public-urls";
import { ExternalLink } from "lucide-react";
import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { FloatingInput } from "@/components/auth/FloatingInput";
import { PasswordStrengthInput } from "@/components/auth/PasswordStrengthInput";
import { cn } from "@/lib/utils";

export const AUTH_LOGIN_FORM_ID = "auth-login-form";

type Props = {
  email: string;
  password: string;
  error: string | null;
  emailError?: string | null;
  loading: boolean;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function AuthLoginForm({
  email,
  password,
  error,
  emailError = null,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: Props) {
  const userAuthUrl = userWebUrl("/auth");

  return (
    <form id={AUTH_LOGIN_FORM_ID} onSubmit={onSubmit} className="space-y-3.5">
      <FloatingInput
        id="login-email"
        label="Email"
        value={email}
        onChange={onEmailChange}
        type="email"
        autoComplete="email"
        required
        error={emailError ?? undefined}
      />
      <div className="space-y-2">
        <PasswordStrengthInput
          id="login-password"
          label="Parol"
          value={password}
          onChange={onPasswordChange}
          autoComplete="current-password"
          required
        />
        <div className="flex justify-end">
          <button
            type="button"
            disabled
            title="Tez orada"
            className="cursor-not-allowed text-xs font-medium text-muted-foreground opacity-60"
          >
            Parolni unutdingizmi?
          </button>
        </div>
      </div>

      <AuthErrorAlert error={error && !emailError ? error : null} />

      <AuthSubmitButton variant="brand" loading={loading} disabled={loading}>
        {loading ? "Kutilmoqda..." : "Kabinetga kirish"}
      </AuthSubmitButton>

      <div className="border-t border-zinc-100 pt-3 text-center">
        <a
          href={userAuthUrl}
          className={cn("inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground")}
        >
          Mijoz sifatida kirish
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </form>
  );
}
