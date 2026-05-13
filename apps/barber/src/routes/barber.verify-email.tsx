import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/barber/verify-email")({
  validateSearch: (raw: Record<string, unknown>) => ({
    token: typeof raw.token === "string" ? raw.token : "",
  }),
  component: BarberVerifyEmailPage,
});

function BarberVerifyEmailPage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("err");
        setMsg("Havolada token yo‘q.");
        return;
      }
      const res = await apiFetch("/api/v1/barber/auth/verify-email/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setStatus("err");
        setMsg(body.detail || "Tasdiqlab bo‘lmadi");
        return;
      }
      setStatus("ok");
      setMsg(body.detail || "Email tasdiqlandi.");
    };
    void run();
  }, [token]);

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
            <Link
              to="/barber/activation"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Davom etish
            </Link>
          </>
        )}
        {status === "err" && (
          <>
            <p className="text-sm text-destructive">{msg}</p>
            <Link to="/barber/activation" className="text-sm text-primary underline">
              Aktivatsiya sahifasiga
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
