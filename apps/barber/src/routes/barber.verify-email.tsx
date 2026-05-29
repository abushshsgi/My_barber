import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Mail, Smartphone } from "lucide-react";
import {
  apiFetch,
  formatFetchError,
  isFetchAbortError,
  RESEND_VERIFICATION_EMAIL_TIMEOUT_MS,
} from "@/lib/api";
import { extractApiError, parseJsonSafe } from "@/lib/auth-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/barber/verify-email")({
  validateSearch: (raw: Record<string, unknown>) => ({
    token: typeof raw.token === "string" ? raw.token.trim() : "",
  }),
  component: BarberVerifyEmailPage,
});

const PARTNER_APP_SCHEME = "mysaloonpartner";

function partnerAppVerifyUrl(token: string): string {
  return `${PARTNER_APP_SCHEME}://verify-email?token=${encodeURIComponent(token)}`;
}

function BarberVerifyEmailPage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<"loading" | "ok" | "err" | "idle">("idle");
  const [msg, setMsg] = useState("");
  const [resending, setResending] = useState(false);
  const appLink = useMemo(() => (token ? partnerAppVerifyUrl(token) : ""), [token]);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("err");
        setMsg(
          "Havolada token yo‘q. Emaildagi to‘liq havolani bosing yoki aktivatsiya sahifasidan xat qayta yuboring.",
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
        setMsg(extractApiError(body, "Tasdiqlab bo‘lmadi.", res));
        return;
      }
      setStatus("ok");
      setMsg(
        typeof body === "object" && body && "detail" in body
          ? String((body as { detail?: string }).detail)
          : "Email tasdiqlandi.",
      );
    };
    void run();
  }, [token]);

  const onResend = async () => {
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
      setMsg(
        "Yangi tasdiq xati yuborildi. Pochtangizdagi yangi havolani oching (token bilan).",
      );
    } catch (e: unknown) {
      setStatus("err");
      if (isFetchAbortError(e)) {
        setMsg(
          "So‘rov uzoqqa cho‘zilmoqda yoki to‘xtatildi. Keyinroq qayta urinib ko‘ring; SMTP sozlamalarini ham tekshiring.",
        );
        return;
      }
      setMsg(formatFetchError(e, "Xat yuborilmadi."));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border bg-card p-6 text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="size-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Email tekshirilmoqda…</p>
          </>
        )}
        {status === "ok" && (
          <>
            <p className="text-sm text-foreground">{msg}</p>
            {appLink ? (
              <a
                href={appLink}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium text-foreground"
              >
                <Smartphone className="size-4" />
                Partner ilovasida davom etish
              </a>
            ) : null}
            <Link
              to="/barber/activation"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Vebda davom etish
            </Link>
          </>
        )}
        {(status === "err" || status === "idle") && (
          <>
            <p className="text-sm text-destructive">{msg || "Token kutilmoqda…"}</p>
            {token && appLink ? (
              <a
                href={appLink}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium text-foreground"
              >
                <Smartphone className="size-4" />
                Partner ilovasida ochish
              </a>
            ) : null}
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full"
                disabled={resending}
                onClick={() => void onResend()}
              >
                {resending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Mail className="size-4" />
                )}
                <span className="ml-2">Tasdiq xatini yuborish</span>
              </Button>
              <Link to="/barber/activation" className="text-sm text-primary underline">
                Aktivatsiya sahifasiga
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
