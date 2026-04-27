import { createFileRoute } from "@tanstack/react-router";
import { Plus, Megaphone, Copy, Sparkles, Send } from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { PageHeader, SectionCard, StatusPill } from "@/components/barber/primitives";
import { toast } from "sonner";

export const Route = createFileRoute("/barber/marketing")({
  component: MarketingPage,
});

function MarketingPage() {
  const { promos, togglePromo, clients } = useBarberContext();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Marketing"
        description="Promokodlar, aksiyalar va mijoz jalb qilish."
        actions={
          <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90">
            <Plus className="size-4" />
            Yangi promokod
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Hero
          icon={<Megaphone className="size-5" />}
          title="Aksiya yuborish"
          desc="Barcha mijozlarga push xabar yuboring."
          cta="Boshlash"
        />
        <Hero
          icon={<Sparkles className="size-5" />}
          title="Loyallik dasturi"
          desc="Doimiy mijozlar uchun chegirmalar."
          cta="Yoqish"
        />
        <Hero
          icon={<Send className="size-5" />}
          title="SMS reklama"
          desc={`${clients.length} ta mijozga SMS yuboring.`}
          cta="Tayyorlash"
        />
      </div>

      <SectionCard title="Promokodlar" description={`${promos.filter(p => p.is_active).length} ta faol`}>
        <div className="space-y-3">
          {promos.map((p) => (
            <div
              key={p.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="px-3 py-2 rounded-lg bg-foreground text-background font-mono text-sm font-semibold inline-flex items-center gap-2">
                  {p.code}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(p.code);
                      toast.success(`${p.code} nusxalandi`);
                    }}
                  >
                    <Copy className="size-3.5 opacity-70 hover:opacity-100" />
                  </button>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{p.description}</div>
                  <div className="text-xs text-muted-foreground">
                    -{p.discount_pct}% · {p.uses}/{p.max_uses} ishlatildi · tugash: {p.expires}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill status={p.is_active ? "active" : "inactive"} />
                <button
                  onClick={() => togglePromo(p.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted"
                >
                  {p.is_active ? "O'chirish" : "Yoqish"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Mijozlarga e'lon" description="Push, SMS yoki email orqali yuboring">
        <div className="space-y-3">
          <input
            placeholder="Sarlavha"
            className="w-full h-11 px-4 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
          />
          <textarea
            placeholder="Xabar matni..."
            rows={4}
            className="w-full px-4 py-3 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {clients.length} ta mijozga yuboriladi
            </div>
            <button
              onClick={() => toast.success("Xabar yuborildi (demo)")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
            >
              <Send className="size-4" />
              Yuborish
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function Hero({ icon, title, desc, cta }: { icon: React.ReactNode; title: string; desc: string; cta: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:border-foreground/30 transition-colors">
      <div className="size-10 rounded-lg bg-foreground text-background flex items-center justify-center mb-3">
        {icon}
      </div>
      <div className="font-heading font-medium">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{desc}</div>
      <button className="mt-4 text-sm font-medium underline-offset-4 hover:underline">{cta} →</button>
    </div>
  );
}
