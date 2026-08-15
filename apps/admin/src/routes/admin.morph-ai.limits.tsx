import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/EmptyState";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchMorphAiLimits, patchMorphAiSettings } from "@/lib/admin-api";
import { MorphAiSeeAllLink } from "@/components/admin/MorphAiSeeAllLink";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/morph-ai/limits")({
  component: MorphLimitsPage,
});

function MorphLimitsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "morph-ai", "limits"],
    queryFn: fetchMorphAiLimits,
  });
  const [tryonLimit, setTryonLimit] = useState("20");
  const [analyzeLimit, setAnalyzeLimit] = useState("30");
  const [tryonOn, setTryonOn] = useState(true);
  const [analyzeOn, setAnalyzeOn] = useState(true);
  const [refGenOn, setRefGenOn] = useState(true);

  useEffect(() => {
    if (!q.data) return;
    setTryonLimit(String(q.data.settings.daily_tryon_limit_per_user));
    setAnalyzeLimit(String(q.data.settings.daily_analyze_limit_per_user));
    setTryonOn(q.data.settings.tryon_enabled);
    setAnalyzeOn(q.data.settings.analyze_enabled);
    setRefGenOn(q.data.settings.referral_generation_enabled !== false);
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      patchMorphAiSettings({
        daily_tryon_limit_per_user: Number(tryonLimit) || 0,
        daily_analyze_limit_per_user: Number(analyzeLimit) || 0,
        tryon_enabled: tryonOn,
        analyze_enabled: analyzeOn,
        referral_generation_enabled: refGenOn,
      }),
    onSuccess: () => {
      toast.success("Limitlar saqlandi");
      void qc.invalidateQueries({ queryKey: ["admin", "morph-ai", "limits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = q.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Limitlar / abuse</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kunlik try-on limania, heavy foydalanuvchilar va on/off
        </p>
      </div>

      {q.isLoading || !d ? (
        <CardSkeleton className="h-48" />
      ) : (
        <>
          <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Kunlik try-on limani (0 = yo'q)</span>
              <Input value={tryonLimit} onChange={(e) => setTryonLimit(e.target.value)} type="number" min={0} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Kunlik tahlil limani (0 = yo'q)</span>
              <Input
                value={analyzeLimit}
                onChange={(e) => setAnalyzeLimit(e.target.value)}
                type="number"
                min={0}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              Try-on yoqilgan
              <Switch checked={tryonOn} onCheckedChange={setTryonOn} />
            </label>
            <label className="flex items-center justify-between text-sm">
              Tahlil yoqilgan
              <Switch checked={analyzeOn} onCheckedChange={setAnalyzeOn} />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm sm:col-span-2">
              <span>
                <span className="font-medium">1 referal = 1 generatsiya</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  O&apos;chirilsa kredit berilmaydi, ishlamaydi va user/mobile UI da ko&apos;rinmaydi.
                </span>
              </span>
              <Switch checked={refGenOn} onCheckedChange={setRefGenOn} />
            </label>
            <div className="sm:col-span-2">
              <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
                Saqlash
              </Button>
            </div>
          </div>

          <div>
            <h2 className="font-heading text-lg font-semibold">Bugungi eng faol userlar</h2>
            <p className="mt-1 text-sm text-muted-foreground">Eng oxirgi / eng faol 10 ta</p>
            {d.heavy_users_today.length === 0 ? (
              <EmptyState className="mt-4" title="Hali faollik yo'q" />
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Try-on</TableHead>
                      <TableHead className="text-right">Xarajat</TableHead>
                      <TableHead>Flag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.heavy_users_today.slice(0, 10).map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <Link
                            to="/admin/users/$userId"
                            params={{ userId: String(u.user_id) }}
                            className="font-medium hover:underline"
                          >
                            {u.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">{u.phone}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{u.tryon_today}</TableCell>
                        <TableCell className="text-right tabular-nums">${u.cost_usd}</TableCell>
                        <TableCell>
                          {u.over_limit ? (
                            <Badge variant="destructive">Limit</Badge>
                          ) : (
                            <Badge variant="outline">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="px-4 pb-3">
                  <MorphAiSeeAllLink kind="active-users" />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
