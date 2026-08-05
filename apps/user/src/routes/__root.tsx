import { useEffect } from "react";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import "../i18n/config";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { I18nProvider } from "../components/I18nProvider";
import { LangAwareOutlet } from "../components/LangAwareOutlet";
import { UserLayout } from "../components/UserLayout";
import { DeployRecovery } from "../components/DeployRecovery";
import { ClientOnly } from "../components/ClientOnly";
import { CLIENT_BOOT_SCRIPT } from "../lib/client-boot-script";
import { Toaster } from "sonner";
import { APP_BUILD_ID } from "../lib/app-build-id";
import { isChunkLoadError, reloadForChunkError } from "../lib/chunk-reload";
import { requireAuth } from "../lib/require-auth";
import { AudienceProvider } from "../hooks/use-audience";
import { CurrencyProvider } from "../hooks/use-currency";
import { AuthSessionGuard } from "../components/AuthSessionGuard";
import { OnboardingGuard } from "../components/OnboardingGuard";
import { GoogleAnalytics } from "../components/GoogleAnalytics";
import { GA_ENABLED, GA_MEASUREMENT_ID } from "../lib/ga";

const GA_BOOTSTRAP = GA_ENABLED
  ? `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
`.trim()
  : "";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Sahifa topilmadi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bu sahifa mavjud emas yoki ko'chirilgan.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold tracking-wide text-primary-foreground"
          >
            Bosh sahifaga
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);

  useEffect(() => {
    if (isChunkLoadError(error)) {
      reloadForChunkError();
    }
  }, [error]);

  const isChunk = isChunkLoadError(error);
  const hardReload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("_reload", Date.now().toString(36));
    window.location.replace(url.toString());
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight">Xatolik yuz berdi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isChunk
            ? "Sayt yangilandi — sahifani qayta yuklang."
            : "Sahifa yuklanmadi. Qaytadan urinib ko'ring."}
        </p>
        {import.meta.env.DEV ? (
          <p className="mt-3 break-all text-left text-xs font-mono text-muted-foreground">
            {error.message}
          </p>
        ) : null}
        <p className="mt-2 text-[10px] text-muted-foreground">Build: {APP_BUILD_ID}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isChunk) {
                hardReload();
                return;
              }
              reset();
            }}
            className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            {isChunk ? "Yangilash" : "Qaytadan"}
          </button>
          <a
            href="/"
            className="rounded-2xl border border-border bg-background px-5 py-3 text-sm font-bold"
          >
            Bosh sahifa
          </a>
        </div>
      </div>
    </div>
  );
}

function RoutePending() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-border"
      aria-hidden
    >
      <div className="h-full w-1/3 animate-pulse bg-foreground" />
    </div>
  );
}

const sharedRootOptions = {
  beforeLoad: async ({ location }: { location: { pathname: string } }) => {
    await requireAuth(location.pathname);
  },
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    ...sharedRootOptions,
    ssr: false,
    pendingComponent: RoutePending,
    head: () => ({
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      ],
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { httpEquiv: "Cache-Control", content: "no-cache, no-store, must-revalidate" },
        { httpEquiv: "Pragma", content: "no-cache" },
        { httpEquiv: "Expires", content: "0" },
        { name: "theme-color", content: "#ffffff" },
        { title: "mysaloon.uz — Online salon bron qilish" },
        {
          name: "description",
          content:
            "mysaloon.uz — O'zbekistondagi sartaroshlar va go'zallik salonlarini online bron qiluvchi platforma.",
        },
        { property: "og:title", content: "mysaloon.uz" },
        { property: "og:description", content: "Online salon va sartaroshxona bron platforma." },
        { property: "og:type", content: "website" },
        { property: "og:image", content: "https://www.mysaloon.uz/brand-logo.png" },
      ],
    }),
    shellComponent: RootShell,
  },
);

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: CLIENT_BOOT_SCRIPT }} />
        {GA_ENABLED ? (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <script dangerouslySetInnerHTML={{ __html: GA_BOOTSTRAP }} />
          </>
        ) : null}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppShell() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AudienceProvider>
        <CurrencyProvider>
          <AuthSessionGuard>
            <OnboardingGuard>
              <UserLayout>
                <LangAwareOutlet />
              </UserLayout>
            </OnboardingGuard>
          </AuthSessionGuard>
          <ClientOnly>
            <GoogleAnalytics />
            <DeployRecovery />
            <Toaster position="top-center" />
          </ClientOnly>
        </CurrencyProvider>
      </AudienceProvider>
    </QueryClientProvider>
  );
}

function RootComponent() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  );
}
