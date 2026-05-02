import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { apiFetch, formatApiError } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/barber/salon-view/team")({
  component: SalonTeamPage,
});

type BarberDetail = { id?: number; email?: string; full_name?: string; phone?: string };

type MembershipRow = {
  id: number;
  barber_detail?: BarberDetail | null;
  salon_name?: string;
  role: string;
  invite_state: string;
};

function unwrapList<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object" && Array.isArray((body as { results?: T[] }).results)) {
    return (body as { results: T[] }).results;
  }
  return [];
}

function inviteLabel(state: string): string {
  switch (state) {
    case "active":
      return "Faol";
    case "invited":
      return "Taklif qilingan";
    case "worker_accepted":
      return "Tasdiqlash kutilmoqda";
    case "declined":
      return "Rad etilgan";
    case "na":
      return "—";
    default:
      return state;
  }
}

function roleLabel(role: string): string {
  return role === "owner" ? "Ega" : role === "worker" ? "Ishchi" : role;
}

function SalonTeamPage() {
  const { ownsSalon, activeSalonId, salon } = useBarberContext();
  const salonPk = activeSalonId ?? (salon.id ? Number(salon.id) : null);

  const [rows, setRows] = useState<MembershipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!ownsSalon || salonPk == null || !Number.isFinite(salonPk)) {
      setRows([]);
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/v1/memberships/?salon=${salonPk}`);
        const raw = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) {
          setError(formatApiError(raw, "A'zolar ro'yxatini yuklab bo'lmadi."));
          setRows([]);
        } else {
          setRows(unwrapList<MembershipRow>(raw));
        }
      } catch {
        if (!alive) return;
        setError("Tarmoq xatosi.");
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ownsSalon, salonPk]);

  if (!ownsSalon) {
    return <Navigate to="/barber/salon-view" replace />;
  }

  if (salonPk == null || !Number.isFinite(salonPk)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1100px] mx-auto">
        <Alert>
          <AlertDescription>Salon tanlanmagan yoki maʼlumot hali yuklanmagan.</AlertDescription>
        </Alert>
        <Link
          to="/barber/salon-view"
          className="inline-block mt-4 text-sm text-primary underline underline-offset-2"
        >
          Salon sahifasiga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-foreground">Jamoa</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {salon.name} salonidagi barberlar va takliflar.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" />
          Salon egasi ko‘rinishi
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Yuklanmoqda...
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-xl border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground uppercase text-[11px] tracking-wide">
              <th className="px-4 py-3 font-medium">Sartarosh</th>
              <th className="px-4 py-3 font-medium">Aloqa</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Holat</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              rows.map((row) => {
                const bd = row.barber_detail;
                const name =
                  bd?.full_name?.trim() ||
                  (bd?.email
                    ? String(bd.email).split("@")[0]
                    : `Barber ${row.barber_detail?.id ?? row.id}`);
                return (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        {bd?.email && <span>{bd.email}</span>}
                        {bd?.phone && <span>{bd.phone}</span>}
                        {!bd?.email && !bd?.phone && <span>—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">{roleLabel(row.role)}</td>
                    <td className="px-4 py-3">{inviteLabel(row.invite_state)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {!loading && rows.length === 0 && !error && (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            Hali aʼzolar yo‘q.
          </div>
        )}
      </div>
    </div>
  );
}
