import { Outlet, Link, Navigate, createRootRoute, useLocation, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AppSidebar } from "@/components/app-sidebar";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { makeQueryClient } from "@/lib/query-client";
import { getToken } from "@/lib/api";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-display text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MyBarber — Professional Barber Panel" },
      { name: "description", content: "Modern barber management dashboard" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const [queryClient] = useState(() => makeQueryClient());
  const location = useLocation();
  const hasAccess = typeof window === "undefined" ? true : !!getToken("barber").access;
  const isAuthPage = location.pathname === "/auth";

  return (
    <QueryClientProvider client={queryClient}>
      {!hasAccess && !isAuthPage ? (
        <Navigate to="/auth" />
      ) : isAuthPage ? (
        <Outlet />
      ) : (
        <div className="flex min-h-screen">
          <AppSidebar />
          <main className="ml-60 flex-1">
            <Outlet />
          </main>
        </div>
      )}
    </QueryClientProvider>
  );
}
