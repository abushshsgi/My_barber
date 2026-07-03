import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { verifyEmailLink } from "@/lib/api/email";
import { getUserAccessToken, getUserRefreshToken } from "@/lib/api/client";
import { setSession } from "@/lib/auth";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({ meta: [{ title: "Email tasdiqlash — mysaloon.uz" }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const { data: me } = useMe();
  const [done, setDone] = useState(false);

  const verify = useMutation({
    mutationFn: () => {
      if (!token) throw new Error(t("emailVerify.invalid", { defaultValue: "Havola noto'g'ri" }));
      return verifyEmailLink(token);
    },
    onSuccess: (res) => {
      setDone(true);
      const access = getUserAccessToken();
      const refresh = getUserRefreshToken();
      if (access && refresh) {
        setSession(access, refresh, res.user);
      }
    },
  });

  useEffect(() => {
    if (!token || verify.isPending || verify.isSuccess || verify.isError) return;
    verify.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="mobile-neo flex min-h-full items-center justify-center px-4 py-16">
      <div className="neo-panel w-full max-w-md p-8 text-center">
        {!token ? (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">{t("emailVerify.invalid", { defaultValue: "Havola noto'g'ri" })}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("emailVerify.invalidHint", { defaultValue: "Email xabaringizdagi havolani qayta oching." })}
            </p>
          </>
        ) : verify.isPending ? (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
            <h1 className="mt-4 text-xl font-semibold">{t("emailVerify.checking", { defaultValue: "Tasdiqlanmoqda…" })}</h1>
          </>
        ) : verify.isError ? (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">{t("emailVerify.failed", { defaultValue: "Tasdiqlanmadi" })}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{(verify.error as Error).message}</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-4 text-xl font-semibold">{t("emailVerify.success", { defaultValue: "Email tasdiqlandi" })}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {me?.display_email || verify.data?.user.display_email}
            </p>
          </>
        )}

        <Link
          to="/settings"
          search={{ section: "personal" }}
          className="neo-cta mt-6 inline-flex bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          onClick={() => {
            if (done) navigate({ to: "/settings", search: { section: "personal" } });
          }}
        >
          {t("settings.title", { defaultValue: "Sozlamalar" })}
        </Link>
      </div>
    </div>
  );
}
