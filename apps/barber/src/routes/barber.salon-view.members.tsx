import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { UserAvatar } from "@/components/barber/primitives";
import { apiFetch, formatApiError } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/barber/salon-view/members")({
  component: SalonMembersWorkerPage,
});

type StaffRow = {
  id: number;
  full_name: string;
  avatar: string | null;
  role: string;
  experience_years: number | null;
};

function roleLabel(role: string): string {
  return role === "owner" ? "Ega" : role === "worker" ? "Ishchi" : role;
}

function SalonMembersWorkerPage() {
  const { ownsSalon, isJoinedWorker, activeSalonId, salon } = useBarberContext();
  const salonPk = activeSalonId ?? (salon.id ? Number(salon.id) : null);

  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    if (ownsSalon) {
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    if (!isJoinedWorker || salonPk == null || !Number.isFinite(salonPk)) {
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
        const res = await apiFetch(`/api/v1/salons/${salonPk}/staff/`);
        const raw = await res.json().catch(() => []);
        if (!alive) return;
        if (!res.ok) {
          setError(formatApiError(raw, "Jamoa ro'yxatini yuklab bo'lmadi."));
          setRows([]);
        } else {
          setRows(Array.isArray(raw) ? (raw as StaffRow[]) : []);
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
  }, [ownsSalon, isJoinedWorker, salonPk]);

  if (ownsSalon) {
    return <Navigate to="/barber/salon-view/team" replace />;
  }

  if (!isJoinedWorker) {
    return <Navigate to="/barber/salon-view" replace />;
  }

  if (salonPk == null || !Number.isFinite(salonPk)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1100px] mx-auto">
        <Alert>
          <AlertDescription>Salon aniqlanmadi.</AlertDescription>
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
            {salon.name}: faol sartaroshlar ro‘yxati (faqat ko‘rish).
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" />
          Ishchi rejimi
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

      <div className="grid gap-3 sm:grid-cols-2">
        {!loading &&
          rows.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-3"
            >
              <UserAvatar
                src={r.avatar || ""}
                name={r.full_name}
                className="size-12 ring-1 ring-border shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{r.full_name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {roleLabel(r.role)}
                  {r.experience_years != null && r.experience_years > 0
                    ? ` · ${r.experience_years} yil tajriba`
                    : ""}
                </div>
              </div>
            </div>
          ))}
      </div>

      {!loading && rows.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">Hozircha faol jamoa aʼzolari yoʻq.</p>
      )}
    </div>
  );
}
