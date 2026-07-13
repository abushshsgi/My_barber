import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { loginWithGoogle } from "@/lib/api";
import type { PhoneVerifyResponse } from "@/lib/api/types";

type Props = {
  clientId: string;
  busy?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onSuccess: (data: PhoneVerifyResponse) => void;
};

export function GoogleSignInButton({
  clientId,
  busy = false,
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
      const next = Math.min(400, Math.floor(node.getBoundingClientRect().width));
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

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div
        ref={containerRef}
        className={busy ? "pointer-events-none w-full opacity-60" : "w-full"}
      >
        {buttonWidth > 0 ? (
          <GoogleLogin
            onSuccess={(response) => void handleSuccess(response.credential)}
            onError={() => toast.error(t("auth.googleErrGeneric"))}
            theme="outline"
            size="large"
            shape="rectangular"
            text="continue_with"
            width={buttonWidth}
            locale="uz"
          />
        ) : null}
      </div>
    </GoogleOAuthProvider>
  );
}
