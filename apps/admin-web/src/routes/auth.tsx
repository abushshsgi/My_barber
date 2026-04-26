import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiJson, looksLikeEmail, setAdminTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch() as { next?: unknown };
  const next = typeof search.next === "string" && search.next ? search.next : "/admin";
  const navigate = useNavigate();

  const login = useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      return apiJson<{ access: string; refresh: string }>("/api/v1/admin/auth/token/", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: (data) => {
      setAdminTokens(data.access, data.refresh);
      toast.success("Kirish muvaffaqiyatli");
      navigate({ to: next || "/admin" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!looksLikeEmail(email)) {
      toast.error("Email noto‘g‘ri");
      return;
    }
    if (!password) {
      toast.error("Parolni kiriting");
      return;
    }
    login.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-card p-6">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-semibold text-foreground">Admin kirish</h1>
          <p className="text-sm text-muted-foreground mt-1">
            MyBarber admin paneliga kirish uchun email va parolni kiriting.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <Input name="email" type="email" placeholder="admin@mail.uz" autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Parol</label>
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <Button className="w-full" disabled={login.isPending} type="submit">
            {login.isPending ? "Kutilmoqda..." : "Kirish"}
          </Button>
        </form>

        <div className="mt-4 text-xs text-muted-foreground">
          Token saqlanadi va keyingi safar avtomatik kiradi.
        </div>
      </div>
    </div>
  );
}
