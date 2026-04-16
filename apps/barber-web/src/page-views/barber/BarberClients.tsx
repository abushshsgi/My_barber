"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Phone, Loader2, MessageSquareText } from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SalonListApi } from "@/lib/mapSalon";
import { fetchBarberMe } from "@/data/barber-me";

type ClientRow = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  completed_bookings: number;
  total_spent: string;
  classification: "new" | "returning";
};

async function fetchMineSalons(): Promise<SalonListApi[]> {
  const res = await apiFetch("/api/v1/salons/mine/");
  if (!res.ok) throw new Error("Salonlar yuklanmadi");
  return res.json() as Promise<SalonListApi[]>;
}

async function fetchClients(salonId: number): Promise<ClientRow[]> {
  const res = await apiFetch(`/api/v1/analytics/clients/?salon=${salonId}`);
  if (!res.ok) throw new Error("Mijozlar yuklanmadi");
  return res.json() as Promise<ClientRow[]>;
}

async function fetchIndependentClients(): Promise<ClientRow[]> {
  const res = await apiFetch("/api/v1/analytics/clients/independent/");
  if (!res.ok) throw new Error("Mijozlar yuklanmadi");
  return res.json() as Promise<ClientRow[]>;
}

const BarberClients = () => {
  const [tab, setTab] = useState<"all" | "new" | "returning">("all");
  const [salonId, setSalonId] = useState<number | null>(null);
  const router = useRouter();

  const { data: me, isLoading: loadingMe } = useQuery({
    queryKey: ["barber", "auth", "me"],
    queryFn: fetchBarberMe,
    staleTime: 60_000,
  });
  const isIndependent = me?.work_mode === "independent";

  const { data: mine = [], isLoading: loadingSalons } = useQuery({
    queryKey: ["salons", "mine"],
    queryFn: fetchMineSalons,
    enabled: !isIndependent,
  });

  const activeSalon = salonId ?? mine[0]?.id ?? null;

  const { data: clients = [], isLoading } = useQuery({
    queryKey: isIndependent ? ["clients", "independent"] : ["clients", activeSalon],
    queryFn: () => (isIndependent ? fetchIndependentClients() : fetchClients(activeSalon!)),
    enabled: isIndependent || !!activeSalon,
  });

  const filtered =
    tab === "new"
      ? clients.filter((c) => c.classification === "new")
      : tab === "returning"
        ? clients.filter((c) => c.classification === "returning")
        : clients;

  if (loadingMe || (!isIndependent && loadingSalons)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isIndependent && !mine.length) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Avval salon yarating.
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b px-4 py-3">
        <h1 className="text-xl font-bold mb-3">Mijozlar</h1>
        {!isIndependent && mine.length > 1 && (
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
        <div className="flex gap-2">
          {[
            { key: "all" as const, label: "Barchasi" },
            { key: "new" as const, label: "Yangi" },
            { key: "returning" as const, label: "Qaytgan" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        )}
        {!isLoading &&
          filtered.map((client, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-3 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                  {client.full_name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{client.full_name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {client.phone || "—"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-accent">
                    {client.completed_bookings} band
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {parseFloat(client.total_spent).toLocaleString()} so&apos;m
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {client.classification === "new" ? "yangi" : "qaytgan"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="ml-2 rounded-xl"
                  aria-label="Chat"
                  onClick={async () => {
                    const res = await apiFetch("/api/v1/chat/conversations/", {
                      method: "POST",
                      body: JSON.stringify({ user_id: client.id }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      toast.error(formatApiError(data, "Chat ochilmadi"));
                      return;
                    }
                    const convo = data as { id: string };
                    router.push(`/chat/${convo.id}`);
                  }}
                >
                  <MessageSquareText className="h-4 w-4" />
                </Button>
              </Card>
            </motion.div>
          ))}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Mijozlar yo&apos;q</p>
        )}
      </div>
    </div>
  );
};

export default BarberClients;
