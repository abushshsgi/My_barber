import { userWebUrl } from "@mybarber/shared/public-urls";
import { ExternalLink } from "lucide-react";
import { AuthErrorAlert } from "@/components/auth/AuthErrorAlert";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { FloatingInput } from "@/components/auth/FloatingInput";
import { PasswordStrengthInput } from "@/components/auth/PasswordStrengthInput";

type Props = {
  email: string;
  password: string;
  error: string | null;
  loading: boolean;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function AuthLoginForm({
  email,
  password,
  error,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: Props) {
  const userAuthUrl = userWebUrl("/auth");

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FloatingInput
        id="login-email"
        label="Email"
        value={email}
        onChange={onEmailChange}
        type="email"
        autoComplete="email"
        required
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

      <AuthErrorAlert error={error} />

      <AuthSubmitButton loading={loading} disabled={loading}>
        {loading ? "Kutilmoqda..." : "Kirish"}
      </AuthSubmitButton>

      <div className="pt-2 text-center">
        <a
          href={userAuthUrl}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground transition-[var(--transition-smooth)] hover:text-foreground"
        >
          Mijoz sifatida kirish
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </form>
  );
}
