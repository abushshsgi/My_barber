"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { SalonListApi } from "@/lib/mapSalon";

type Membership = {
  id: number;
  barber: number;
  salon: number;
  salon_name: string;
  role: string;
  invite_state: string;
  barber_detail: { id: number; email: string; full_name: string; phone: string | null };
};

function inviteStateLabel(state: string): string {
  const map: Record<string, string> = {
    na: "—",
    invited: "Taklif kutilmoqda",
    worker_accepted: "Ishchi rozilik berdi — tasdiqlang",
    active: "Faol",
    declined: "Rad etilgan",
  };
  return map[state] ?? state;
}

type UserHit = { id: number; email: string; full_name: string; phone: string | null };

async function fetchMineSalons(): Promise<SalonListApi[]> {
  const res = await apiFetch("/api/v1/salons/mine/");
  if (!res.ok) throw new Error("Salonlar yuklanmadi");
  return res.json() as Promise<SalonListApi[]>;
}

async function fetchMemberships(): Promise<Membership[]> {
  const res = await apiFetch("/api/v1/memberships/");
  if (!res.ok) throw new Error("A'zolar yuklanmadi");
  const j = (await res.json()) as { results?: Membership[] } | Membership[];
  return Array.isArray(j) ? j : j.results || [];
}

async function searchBarbers(q: string): Promise<UserHit[]> {
  if (!q.trim()) return [];
  const res = await apiFetch(`/api/v1/barbers/search/?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const j = (await res.json()) as UserHit[] | { results?: UserHit[] };
  return Array.isArray(j) ? j : j.results || [];
}

const BarberTeam = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [salonId, setSalonId] = useState<number | null>(null);

  const { data: mine = [], isLoading: loadingSalons } = useQuery({
    queryKey: ["salons", "mine"],
    queryFn: fetchMineSalons,
  });

  const activeSalon = salonId ?? mine[0]?.id ?? null;

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ["memberships"],
    queryFn: fetchMemberships,
  });

  const { data: hits = [] } = useQuery({
    queryKey: ["barber-search", search],
    queryFn: () => searchBarbers(search),
    enabled: search.trim().length >= 2,
  });

  const salonMembers = memberships.filter((m) => m.salon === activeSalon);

  const invite = useMutation({
    mutationFn: async (barberId: number) => {
      const res = await apiFetch("/api/v1/memberships/invite/", {
        method: "POST",
        body: JSON.stringify({ salon: activeSalon, barber_id: barberId }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error((e as { detail?: string }).detail || "Taklif yuborilmadi");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memberships"] }),
  });

  const ownerConfirm = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/memberships/${id}/owner_confirm/`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Xato");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memberships"] }),
  });

  if (loadingSalons) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!mine.length) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Avval salon yarating. Faqat salon egasi taklif yubora oladi.
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b px-4 py-3">
        <h1 className="text-xl font-bold mb-3">Jamoa</h1>
        {mine.length > 1 && (
          <select
            className="w-full mb-3 h-10 px-3 rounded-xl border bg-background text-sm"
            value={activeSalon ?? ""}
            onChange={(e) => setSalonId(Number(e.target.value))}
          >
            {mine.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Email yoki telefon bo'yicha qidirish"
            className="pl-9 rounded-xl bg-muted border-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {search.trim().length >= 2 && (
          <div className="space-y-2">
            {hits.map((u) => (
              <Card key={u.id} className="p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{u.full_name || u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Button
                  size="sm"
                  className="rounded-xl gold-gradient text-gold-foreground border-0"
                  disabled={!activeSalon || invite.isPending}
                  onClick={() => invite.mutate(u.id)}
                >
                  <UserPlus className="h-4 w-4 mr-1" /> Taklif
                </Button>
              </Card>
            ))}
            {hits.length === 0 && <p className="text-xs text-muted-foreground">Natija yo&apos;q</p>}
          </div>
        )}

        <div>
          <h3 className="font-semibold text-sm mb-2">Jamoa a&apos;zolari</h3>
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          )}
          {!isLoading &&
            salonMembers.map((m) => (
              <Card key={m.id} className="p-3 flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                  {(m.barber_detail.full_name || m.barber_detail.email).slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{m.barber_detail.full_name || m.barber_detail.email}</p>
                  <p className="text-xs text-muted-foreground">{inviteStateLabel(m.invite_state)}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="text-xs font-medium text-success bg-success/15 px-2 py-0.5 rounded-full">
                    {m.role}
                  </span>
                  {m.invite_state === "worker_accepted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => ownerConfirm.mutate(m.id)}
                      disabled={ownerConfirm.isPending}
                    >
                      Tasdiqlash
                    </Button>
                  )}
                  {m.invite_state === "invited" && (
                    <span className="text-[10px] text-muted-foreground">Javob kutilmoqda</span>
                  )}
                </div>
              </Card>
            ))}
        </div>

        {invite.isError && (
          <p className="text-sm text-destructive">{(invite.error as Error).message}</p>
        )}
      </div>
    </div>
  );
};

export default BarberTeam;
