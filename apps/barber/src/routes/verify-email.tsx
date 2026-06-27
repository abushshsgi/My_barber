import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Mail, Smartphone, XCircle } from "lucide-react";
import {
  apiFetch,
  formatFetchError,
  getBarberAccessToken,
  isFetchAbortError,
  RESEND_VERIFICATION_EMAIL_TIMEOUT_MS,
} from "@/lib/api";
import { extractApiError, parseJsonSafe } from "@/lib/auth-ui";
import { Button } from "@/components/ui/button";
import { invalidateOnboardingAfterActivationChange } from "@/lib/onboarding-status-cache";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (raw: Record<string, unknown>) => ({
    token: typeof raw.token === "string" ? raw.token.trim() : "",
  }),
  head: () => ({ meta: [{ title: "Email tasdiqlash — MySaloon Partner" }] }),
  component: PartnerVerifyEmailPage,
});

const PARTNER_APP_SCHEME = "mysaloonpartner";

function partnerAppVerifyUrl(token: string): string {
  return `${PARTNER_APP_SCHEME}://verify-email?token=${encodeURIComponent(token)}`;
}

function PartnerVerifyEmailPage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<"loading" | "ok" | "err" | "idle">("idle");
  const [msg, setMsg] = useState("");
  const [resending, setResending] = useState(false);
  const hasSession = typeof window !== "undefined" && Boolean(getBarberAccessToken());
  const appLink = useMemo(() => (token ? partnerAppVerifyUrl(token) : ""), [token]);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("err");
        setMsg(
          "Havolada token yo'q. Emaildagi to'liq havolani bosing yoki quyidagi sahifadan yangi xat so'rang.",
        );
        return;
      }
      setStatus("loading");
      const res = await apiFetch("/api/v1/barber/auth/verify-email/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await parseJsonSafe(res);
      if (!res.ok) {
        setStatus("err");
        setMsg(extractApiError(body, "Tasdiqlab bo'lmadi.", res));
        return;
      }
      setStatus("ok");
      invalidateOnboardingAfterActivationChange();
      setMsg(
        typeof body === "object" && body && "detail" in body
          ? String((body as { detail?: string }).detail)
          : "Email muvaffaqiyatli tasdiqlandi.",
      );
    };
    void run();
  }, [token]);

  const onResend = async () => {
    if (!hasSession) {
      setMsg("Yangi xat yuborish uchun avval partner akkauntingizga kiring.");
      setStatus("err");
      return;
    }
    setResending(true);
    try {
      const res = await apiFetch("/api/v1/barber/auth/resend-verification-email/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        timeoutMs: RESEND_VERIFICATION_EMAIL_TIMEOUT_MS,
      });
      const body = await parseJsonSafe(res);
      if (!res.ok) {
        setMsg(extractApiError(body, "Xat yuborilmadi.", res));
        setStatus("err");
        return;
      }
      setStatus("idle");
      setMsg("Yangi tasdiq xati yuborildi. Pochtangizdagi yangi havolani oching.");
    } catch (e: unknown) {
      setStatus("err");
      if (isFetchAbortError(e)) {
        setMsg("So'rov vaqti tugadi. Birozdan keyin qayta urinib ko'ring.");
        return;
      }
      setMsg(formatFetchError(e, "Xat yuborilmadi."));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-viewport flex min-h-[100dvh] flex-col items-center justify-center bg-[#f4f4f5] px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Mail className="size-5" />
        </div>
        <h1 className="font-heading text-xl font-semibold text-foreground">Email tasdiqlash</h1>
        <p className="mt-1 text-sm text-muted-foreground">MySaloon Partner</p>

        {status === "loading" && (
          <div className="mt-8 space-y-3">
            <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Email manzilingiz tekshirilmoqda…</p>
          </div>
        )}

        {status === "ok" && (
          <div className="mt-8 space-y-4">
            <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
            <p className="text-sm text-foreground">{msg}</p>
            {appLink ? (
              <a
                href={appLink}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-foreground"
              >
                <Smartphone className="size-4" />
                Partner ilovasida davom etish
              </a>
            ) : null}
            {hasSession ? (
              <Link
                to="/barber/activation"
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
              >
                Aktivatsiyani davom ettirish
              </Link>
            ) : (
              <Link
                to="/auth"
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
              >
                Kirish va davom etish
              </Link>
            )}
          </div>
        )}

        {(status === "err" || status === "idle") && (
          <div className="mt-8 space-y-4">
            {status === "err" ? (
              <XCircle className="mx-auto size-10 text-destructive" />
            ) : (
              <Mail className="mx-auto size-10 text-muted-foreground" />
            )}
            <p className={`text-sm ${status === "err" ? "text-destructive" : "text-muted-foreground"}`}>
              {msg || "Token kutilmoqda…"}
            </p>
            {token && appLink ? (
              <a
                href={appLink}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium"
              >
                <Smartphone className="size-4" />
                Ilovada ochish
              </a>
            ) : null}
            <div className="flex flex-col gap-2">
              {hasSession ? (
                <Button type="button" className="w-full" disabled={resending} onClick={() => void onResend()}>
                  {resending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  <span className="ml-2">Tasdiq xatini qayta yuborish</span>
                </Button>
              ) : (
                <Link
                  to="/auth"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
                >
                  Kirish — xatni qayta yuborish
                </Link>
              )}
              <Link to="/check-email" className="text-sm text-primary underline">
                Email kelmadimi?
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
