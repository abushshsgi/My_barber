import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import "../i18n/config";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { UserLayout } from "../components/UserLayout";
import { Toaster } from "sonner";

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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
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
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <UserLayout>
        <Outlet />
      </UserLayout>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
