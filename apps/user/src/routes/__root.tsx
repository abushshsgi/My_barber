import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import "../i18n/config";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { I18nProvider } from "../components/I18nProvider";
import { LangAwareOutlet } from "../components/LangAwareOutlet";
import { UserLayout } from "../components/UserLayout";
import { AppVersionWatcher } from "../components/AppVersionWatcher";
import { ClientOnly } from "../components/ClientOnly";
import { CLIENT_BOOT_SCRIPT } from "../lib/client-boot-script";
import { Toaster } from "sonner";
import { APP_BUILD_ID } from "../lib/app-build-id";
import { requireAuth } from "../lib/require-auth";
import { AudienceProvider } from "../hooks/use-audience";
import { AuthSessionGuard } from "../components/AuthSessionGuard";

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
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight">Xatolik yuz berdi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sahifa yuklanmadi. Qaytadan urinib ko'ring.
        </p>
        {import.meta.env.DEV ? (
          <p className="mt-3 break-all text-left text-xs font-mono text-muted-foreground">
            {error.message}
          </p>
        ) : null}
        <p className="mt-2 text-[10px] text-muted-foreground">Build: {APP_BUILD_ID}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            Qaytadan
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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  ssr: false,
  pendingComponent: RoutePending,
  beforeLoad: ({ location }) => {
    requireAuth(location.pathname);
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { httpEquiv: "Cache-Control", content: "no-cache, no-store, must-revalidate" },
      { httpEquiv: "Pragma", content: "no-cache" },
      { httpEquiv: "Expires", content: "0" },
      { name: "theme-color", content: "#faf8f5" },
      { title: "mysaloon.uz — Online salon bron qilish" },
      {
        name: "description",
        content:
          "mysaloon.uz — O'zbekistondagi sartaroshlar va go'zallik salonlarini online bron qiluvchi platforma.",
      },
      { property: "og:title", content: "mysaloon.uz" },
      { property: "og:description", content: "Online salon va sartaroshxona bron platforma." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: CLIENT_BOOT_SCRIPT }} />
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
        <AuthSessionGuard>
          <UserLayout>
            <LangAwareOutlet />
          </UserLayout>
        </AuthSessionGuard>
        <ClientOnly>
          <AppVersionWatcher />
          <Toaster position="top-center" />
        </ClientOnly>
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
