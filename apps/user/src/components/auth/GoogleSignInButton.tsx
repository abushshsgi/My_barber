import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useInAppBrowserDetection } from "@/hooks/useInAppBrowserDetection";
import { loginWithGoogle } from "@/lib/api";
import type { PhoneVerifyResponse } from "@/lib/api/types";
import { requestExternalBrowserPrompt } from "@/lib/external-browser";
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

function GoogleContinueFace({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold text-[#1f1f1f] shadow-[0_10px_28px_-18px_rgba(15,23,42,0.55)] transition-[border-color,box-shadow,transform] duration-200 group-hover:border-[#1a73e8]/35 group-hover:shadow-[0_16px_36px_-20px_rgba(26,115,232,0.45)] group-active:scale-[0.985]">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-black/5">
        <GoogleGlyph className="size-4" />
      </span>
      {label}
    </span>
  );
}

function GoogleSignInButtonInner({
  busy = false,
  onBusyChange,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(320);

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

  const button =
    buttonWidth > 0 ? (
      <GoogleLogin
        onSuccess={(response) => void handleSuccess(response.credential)}
        onError={() => toast.error(t("auth.googleErrGeneric"))}
        theme="outline"
        size="large"
        shape="pill"
        text="continue_with"
        width={buttonWidth}
        locale="uz"
      />
    ) : null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative h-12 w-full overflow-hidden rounded-2xl",
        busy && "pointer-events-none opacity-60",
      )}
    >
      <GoogleContinueFace label={t("auth.googleContinue")} />
      <div className="auth-google-hit absolute inset-0 z-10 overflow-hidden rounded-2xl opacity-0">
        {button}
      </div>
    </div>
  );
}

function InAppGoogleHandoff({ busy }: { busy?: boolean }) {
  const { t } = useTranslation();
  const openExternal = () => requestExternalBrowserPrompt();

  return (
    <button
      type="button"
      disabled={busy}
      onClick={openExternal}
      className="group relative h-12 w-full cursor-pointer overflow-hidden rounded-2xl disabled:opacity-60"
    >
      <GoogleContinueFace label={t("auth.googleContinue")} />
    </button>
  );
}

export function GoogleSignInButton(props: Props) {
  const inApp = useInAppBrowserDetection().isInAppBrowser;
  if (inApp) {
    return <InAppGoogleHandoff busy={props.busy} />;
  }
  return (
    <GoogleOAuthProvider clientId={props.clientId}>
      <GoogleSignInButtonInner {...props} />
    </GoogleOAuthProvider>
  );
}
