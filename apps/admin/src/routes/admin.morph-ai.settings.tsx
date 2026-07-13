import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fetchMorphAiSettings, patchMorphAiSettings } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/morph-ai/settings")({
  component: MorphSettingsPage,
});

function MorphSettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "morph-ai", "settings"],
    queryFn: fetchMorphAiSettings,
  });

  const [promptA, setPromptA] = useState("");
  const [promptB, setPromptB] = useState("");
  const [abOn, setAbOn] = useState(false);
  const [abPct, setAbPct] = useState("50");
  const [model, setModel] = useState("");
  const [alertRate, setAlertRate] = useState("80");

  useEffect(() => {
    if (!q.data) return;
    setPromptA(q.data.custom_tryon_prompt);
    setPromptB(q.data.custom_tryon_prompt_b);
    setAbOn(q.data.ab_enabled);
    setAbPct(String(q.data.ab_traffic_percent_b));
    setModel(q.data.preferred_model);
    setAlertRate(String(q.data.alert_success_rate_below));
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      patchMorphAiSettings({
        custom_tryon_prompt: promptA,
        custom_tryon_prompt_b: promptB,
        ab_enabled: abOn,
        ab_traffic_percent_b: Number(abPct) || 0,
        preferred_model: model,
        alert_success_rate_below: Number(alertRate) || 80,
      }),
    onSuccess: () => {
      toast.success("Sozlamalar saqlandi");
      void qc.invalidateQueries({ queryKey: ["admin", "morph-ai", "settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading || !q.data) {
    return <CardSkeleton className="h-80" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Sozlamalar / A/B</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prompt variantlari, model preferensiya va success-rate alert. Runtime model:{" "}
          <span className="font-medium text-foreground">{q.data.runtime_model || "—"}</span>
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-border bg-card p-5">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Try-on prompt (A)</span>
          <Textarea rows={5} value={promptA} onChange={(e) => setPromptA(e.target.value)} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Try-on prompt (B) — A/B</span>
          <Textarea rows={5} value={promptB} onChange={(e) => setPromptB(e.target.value)} />
        </label>
        <label className="flex items-center justify-between text-sm">
          A/B yoqilgan
          <Switch checked={abOn} onCheckedChange={setAbOn} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">B trafik foizi (0–100)</span>
          <Input type="number" min={0} max={100} value={abPct} onChange={(e) => setAbPct(e.target.value)} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Preferred model (ixtiyoriy)</span>
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={q.data.runtime_model} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Success rate alert (foizdan past)</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={alertRate}
            onChange={(e) => setAlertRate(e.target.value)}
          />
        </label>
        <div>
          <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
            Saqlash
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Eslatma: A/B prompt override try-on generatsiyasiga bosqichma-bosqich ulanadi; limitlar va
        byudjet hozircha to&apos;liq enforce qilinadi.
      </p>
    </div>
  );
}
