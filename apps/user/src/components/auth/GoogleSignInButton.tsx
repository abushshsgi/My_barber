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

function GoogleSignInButtonInner({
  busy = false,
  emphasized = false,
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
        theme={emphasized ? "filled_blue" : "outline"}
        size="large"
        shape="rectangular"
        text="continue_with"
        width={buttonWidth}
        locale="uz"
      />
    ) : null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full overflow-hidden rounded-xl",
        emphasized && "shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]",
        busy && "pointer-events-none opacity-60",
      )}
    >
      {button}
    </div>
  );
}

function InAppGoogleHandoff({ emphasized, busy }: { emphasized?: boolean; busy?: boolean }) {
  const { t } = useTranslation();
  const openExternal = () => requestExternalBrowserPrompt();

  return (
    <button
      type="button"
      disabled={busy}
      onClick={openExternal}
      className={cn(
        "flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 text-sm font-semibold disabled:opacity-60",
        emphasized && "shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]",
      )}
    >
      <GoogleGlyph className="size-5" />
      {t("auth.googleContinue")}
    </button>
  );
}

export function GoogleSignInButton(props: Props) {
  const inApp = useInAppBrowserDetection().isInAppBrowser;
  if (inApp) {
    return <InAppGoogleHandoff emphasized={props.emphasized} busy={props.busy} />;
  }
  return (
    <GoogleOAuthProvider clientId={props.clientId}>
      <GoogleSignInButtonInner {...props} />
    </GoogleOAuthProvider>
  );
}
