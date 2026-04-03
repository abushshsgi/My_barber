"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, MapPin, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

type AppRow = {
  id: number;
  applicant_email: string;
  applicant_name: string;
  shop_name: string;
  age: number;
  region: string;
  address: string;
  status: string;
  created_at: string;
};

export default function AdminApprovals() {
  const qc = useQueryClient();

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["barber-applications"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/admin/barber-applications/");
      if (!res.ok) throw new Error("API");
      const j = (await res.json()) as { results?: AppRow[] } | AppRow[];
      return Array.isArray(j) ? j : j.results || [];
    },
  });

  const act = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "approve" | "reject" }) => {
      const res = await apiFetch(
        `/api/v1/admin/barber-applications/${id}/${action}/`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Xato");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barber-applications"] }),
  });

  const pending = apps.filter((a) => a.status === "pending");
  const processed = apps.filter((a) => a.status !== "pending");

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Yuklanmoqda...</div>;
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b px-4 py-3">
        <h1 className="text-xl font-bold">Arizalar</h1>
        <p className="text-sm text-muted-foreground">{pending.length} ta kutilmoqda</p>
      </div>

      <div className="p-4 space-y-3">
        {pending.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Check className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Barcha arizalar ko&apos;rib chiqildi</p>
          </div>
        )}

        {pending.map((app, i) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{app.applicant_name || app.applicant_email}</h3>
                  <p className="text-sm text-muted-foreground">{app.shop_name}</p>
                </div>
                <span className="text-xs text-muted-foreground">{app.age} yosh</span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" /> {app.region}
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> {app.applicant_email}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => act.mutate({ id: app.id, action: "approve" })}
                  disabled={act.isPending}
                  className="flex-1 rounded-xl bg-success text-success-foreground hover:bg-success/90"
                  size="sm"
                >
                  <Check className="h-4 w-4 mr-1" /> Tasdiqlash
                </Button>
                <Button
                  onClick={() => act.mutate({ id: app.id, action: "reject" })}
                  disabled={act.isPending}
                  variant="outline"
                  className="flex-1 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-1" /> Rad etish
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}

        {processed.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              Ko&apos;rib chiqilgan
            </h3>
            {processed.map((app) => (
              <Card key={app.id} className="p-3 flex items-center justify-between mb-2 opacity-60">
                <div>
                  <p className="text-sm font-medium">{app.shop_name}</p>
                  <p className="text-xs text-muted-foreground">{app.applicant_email}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    app.status === "approved"
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {app.status === "approved" ? "Tasdiqlandi" : "Rad etildi"}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
