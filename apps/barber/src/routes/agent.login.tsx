import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  agentApiJson,
  getAgentAccessToken,
  setAgentTokens,
  type AgentMe,
} from "@/lib/agent-api";

export const Route = createFileRoute("/agent/login")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (getAgentAccessToken()) {
      throw redirect({ to: "/agent" });
    }
  },
  component: AgentLoginPage,
});

function AgentLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await agentApiJson<{
        access: string;
        refresh: string;
        agent: AgentMe;
      }>("/api/v1/agent/auth/token/", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setAgentTokens(data.access, data.refresh);
      toast.success(`Xush kelibsiz, ${data.agent.full_name}`);
      navigate({ to: "/agent" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kirish amalga oshmadi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-50 via-background to-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-card p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <MysaloonLogo className="mx-auto" />
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Agent kabineti
          </h1>
          <p className="text-sm text-muted-foreground">
            Salonlarni MySaloon ga olib kirish uchun agent login
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-email">Email</Label>
            <Input
              id="agent-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-password">Parol</Label>
            <Input
              id="agent-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Kirilmoqda…" : "Kirish"}
          </Button>
        </form>
      </div>
    </div>
  );
}
