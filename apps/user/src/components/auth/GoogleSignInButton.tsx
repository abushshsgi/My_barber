import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { loginWithGoogle } from "@/lib/api";
import type { PhoneVerifyResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Props = {
  clientId: string;
  busy?: boolean;
  emphasized?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onSuccess: (data: PhoneVerifyResponse) => void;
};

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function EmphasizedChrome({
  children,
  busy,
}: {
  children: ReactNode;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "auth-google-card relative overflow-hidden rounded-[1.65rem] border border-foreground/[0.08] bg-background/90 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)] ring-1 ring-inset ring-white/60 backdrop-blur-sm sm:p-6",
        busy && "pointer-events-none opacity-70",
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#1a73e8]/[0.07] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#1a73e8]/[0.08] blur-2xl"
        aria-hidden
      />

      <div className="relative">
        <div className="flex justify-center">
          <span className="inline-flex items-center rounded-full bg-[#1a73e8]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1a73e8]">
            {t("auth.googleRecommended")}
          </span>
        </div>
        <p className="mt-3 text-center text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {t("auth.googleContinue")}
        </p>
        <p className="mt-1 text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {t("auth.googleContinueHint")}
        </p>
        <div className="relative mt-5 w-full">{children}</div>
      </div>
    </div>
  );
}

function GoogleSignInButtonInner({
  busy = false,
  emphasized = false,
  onBusyChange,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => {
      const next = Math.floor(node.getBoundingClientRect().width);
      setButtonWidth(next > 0 ? next : 320);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleSuccess = async (credential?: string) => {
    if (!credential) {
      toast.error(t("auth.googleErrNoToken"));
      return;
    }
    onBusyChange?.(true);
    try {
      const data = await loginWithGoogle(credential);
      onSuccess(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("auth.googleErrGeneric"));
    } finally {
      onBusyChange?.(false);
    }
  };

  const button = buttonWidth > 0 ? (
    <GoogleLogin
      onSuccess={(response) => void handleSuccess(response.credential)}
      onError={() => toast.error(t("auth.googleErrGeneric"))}
      theme={emphasized ? "filled_blue" : "outline"}
      size="large"
      shape="rectangular"
      text="continue_with"
      width={buttonWidth}
      locale="uz"
    />
  ) : null;

  if (!emphasized) {
    return (
      <div ref={containerRef} className={cn("w-full", busy && "pointer-events-none opacity-60")}>
        {button}
      </div>
    );
  }

  return (
    <EmphasizedChrome busy={busy}>
      <div ref={containerRef} className="relative w-full">
        <div
          aria-hidden
          className="auth-google-cta pointer-events-none flex min-h-[58px] items-center justify-center gap-3 rounded-2xl bg-[#1a73e8] px-5 text-white shadow-[0_14px_28px_-12px_rgba(26,115,232,0.55)]"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-white shadow-sm">
            <GoogleGlyph className="size-[18px]" />
          </span>
          <span className="text-[15px] font-bold sm:text-base">{t("auth.googleContinue")}</span>
        </div>
        <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-[0.01] [&_iframe]:!h-full [&_iframe]:!min-h-[58px] [&_iframe]:!w-full">
          {button}
        </div>
      </div>
    </EmphasizedChrome>
  );
}

export function GoogleSignInButton(props: Props) {
  return (
    <GoogleOAuthProvider clientId={props.clientId}>
      <GoogleSignInButtonInner {...props} />
    </GoogleOAuthProvider>
  );
}
