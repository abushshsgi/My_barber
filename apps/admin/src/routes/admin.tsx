import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { apiFetch, getAdminAccessToken } from "@/lib/api";

function AdminRouteErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="p-8">
      <div className="max-w-md">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Admin panelda xatolik
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Qayta urinish
        </button>
      </div>
    </div>
  );
}

async function fetchAdminMeWithRetry(attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await apiFetch("/api/v1/admin/auth/me/");
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((r) => window.setTimeout(r, 300 * (i + 1)));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Serverga ulanib bo'lmadi. Qayta urinib ko'ring.");
}

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    if (!getAdminAccessToken()) {
      throw redirect({ to: "/auth", search: { next: location.href } });
    }
    const res = await fetchAdminMeWithRetry();
    if (!res.ok) {
      throw redirect({ to: "/auth", search: { next: location.href } });
    }
    const data = (await res.json().catch(() => ({}))) as { role?: string };
    if (data.role && data.role !== "ADMIN") {
      throw redirect({ to: "/auth", search: { next: location.href } });
    }
  },
  component: AdminRoot,
  errorComponent: AdminRouteErrorComponent,
});

function AdminRoot() {
  return <AdminShell />;
}
