import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { signInWithPassword, signUpAndSignIn } from "@/lib/auth";
import { fetchRegions, type RegionOption } from "@/lib/user-api";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Kirish — mysaloon.uz" }] }),
  component: Auth,
});

function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRegions()
      .then((rows) => {
        setRegions(rows);
        if (rows[0]) setRegion(rows[0].value);
      })
      .catch(() => {
        setRegions([]);
      });
  }, []);

  const submit = async () => {
    if (!email.trim() || !password) {
      toast.error("Email va parolni kiriting");
      return;
    }
    if (mode === "register" && !fullName.trim()) {
      toast.error("Ism familiyani kiriting");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await signInWithPassword(email, password);
      } else {
        await signUpAndSignIn({
          email,
          password,
          full_name: fullName,
          phone: phone.trim() || undefined,
          region: region || undefined,
        });
      }
      toast.success("Xush kelibsiz!");
      await router.invalidate();
      router.navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kirishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-6 py-10">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight">mysaloon</span>
        <span className="text-base font-bold text-muted-foreground">.uz</span>
      </div>

      <div className="flex flex-1 flex-col justify-center py-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {mode === "login" ? "Mijoz kabineti" : "Yangi mijoz"}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {mode === "login" ? "Xush kelibsiz" : "Ro'yxatdan o'ting"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Backend bilan ulangan real email/parol orqali kiring. Bron, sevimlilar va bildirishnomalar
          shu akkauntga bog'lanadi.
        </p>

        <div className="mt-8 space-y-4">
          {mode === "register" && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Ism familiya
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ali Valiyev"
                className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-4 text-sm font-bold placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ali@example.com"
              className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-4 text-sm font-bold placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Parol
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kamida 8 belgi"
              className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-4 text-sm font-bold placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none"
            />
          </div>

          {mode === "register" && (
            <>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998901234567"
                  className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-4 text-sm font-bold placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Hudud
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-4 py-4 text-sm font-bold focus:border-foreground focus:outline-none"
                >
                  {regions.length === 0 ? (
                    <option value="">Hudud keyin tanlanadi</option>
                  ) : (
                    regions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
          className="mt-6 w-full text-center text-xs font-bold text-muted-foreground underline"
        >
          {mode === "login" ? "Akkauntingiz yo'qmi? Ro'yxatdan o'ting" : "Akkaunt bor — kirish"}
        </button>
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className={cn(
          "w-full rounded-2xl bg-foreground py-4 text-sm font-bold tracking-wide text-background active:scale-[0.99] disabled:opacity-50",
        )}
      >
        {loading ? "Tekshirilmoqda..." : mode === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
      </button>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Davom etish orqali siz{" "}
        <a href="/privacy" className="font-bold underline">
          maxfiylik siyosati
        </a>{" "}
        bilan rozisiz.
      </p>
    </div>
  );
}
