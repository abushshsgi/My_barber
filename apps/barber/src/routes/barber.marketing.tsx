import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Megaphone, Copy, Sparkles, Send, Rocket } from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { PageHeader, SectionCard, StatusPill } from "@/components/barber/primitives";
import { toast } from "sonner";
import { apiFetch, formatApiError } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/barber/marketing")({
  component: MarketingPage,
});

function MarketingPage() {
  const { promos, togglePromo, clients, addPromo, sendAnnouncement } = useBarberContext();
  const boostQ = useQuery({
    queryKey: ["barber", "marketing-boost"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/barber/marketing/boost/");
      if (!res.ok) throw new Error("Boost ma'lumotlari yuklanmadi");
      return res.json() as Promise<{
        packages: Array<{ key: string; days: number; amount: string; label: string }>;
        active: { id: number; ends_at: string; amount_paid: string } | null;
      }>;
    },
  });
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: "",
    description: "",
    discount_pct: "",
    max_uses: "",
    expires: "",
  });
  const [announcement, setAnnouncement] = useState({ title: "", message: "" });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Marketing"
        description="Promokodlar, aksiyalar va mijoz jalb qilish."
        actions={
          <button
            onClick={() => setShowPromoForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
          >
            <Plus className="size-4" />
            Yangi promokod
          </button>
        }
      />
      {showPromoForm && (
        <SectionCard title="Promokod yaratish">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            <input
              value={promoForm.code}
              onChange={(e) => setPromoForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="CODE"
              className="h-10 px-3 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
            />
            <input
              value={promoForm.description}
              onChange={(e) => setPromoForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Tavsif"
              className="sm:col-span-2 h-10 px-3 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
            />
            <input
              type="number"
              value={promoForm.discount_pct}
              onChange={(e) => setPromoForm((p) => ({ ...p, discount_pct: e.target.value }))}
              placeholder="% chegirma"
              className="h-10 px-3 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
            />
            <input
              type="number"
              value={promoForm.max_uses}
              onChange={(e) => setPromoForm((p) => ({ ...p, max_uses: e.target.value }))}
              placeholder="Max uses"
              className="h-10 px-3 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
            />
            <input
              type="date"
              value={promoForm.expires}
              onChange={(e) => setPromoForm((p) => ({ ...p, expires: e.target.value }))}
              className="h-10 px-3 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
            />
            <button
              onClick={async () => {
                if (!promoForm.code.trim()) {
                  toast.error("Code majburiy");
                  return;
                }
                const ok = await addPromo({
                  code: promoForm.code.trim(),
                  description: promoForm.description.trim(),
                  discount_pct: Number(promoForm.discount_pct || 0),
                  max_uses: Number(promoForm.max_uses || 0),
                  expires: promoForm.expires || undefined,
                });
                if (ok) {
                  toast.success("Promokod qo'shildi.");
                  setShowPromoForm(false);
                  setPromoForm({
                    code: "",
                    description: "",
                    discount_pct: "",
                    max_uses: "",
                    expires: "",
                  });
                } else {
                  toast.error("Promokod qo'shib bo'lmadi.");
                }
              }}
              className="h-10 px-3 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
            >
              Saqlash
            </button>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Topga chiqish"
        description="To'lov qilib qidiruvda yuqoriroq ko'rining — admin tasdiqlaydi"
      >
        {boostQ.data?.active ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-3">
            Faol TOP: {boostQ.data.active.ends_at.slice(0, 10)} gacha
          </p>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(boostQ.data?.packages ?? []).map((pkg) => (
            <button
              key={pkg.key}
              type="button"
              onClick={async () => {
                const res = await apiFetch("/api/v1/barber/marketing/boost/", {
                  method: "POST",
                  body: JSON.stringify({ package: pkg.key }),
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) {
                  toast.error(formatApiError(body, "So'rov yuborilmadi."));
                  return;
                }
                toast.success("TOP so'rovi yuborildi — admin tasdiqlaydi.");
                void boostQ.refetch();
              }}
              className="flex items-center gap-3 rounded-xl border border-border p-4 text-left hover:border-foreground/40 transition-colors"
            >
              <Rocket className="size-5 shrink-0" />
              <div>
                <div className="font-medium text-sm">{pkg.label}</div>
                <div className="text-xs text-muted-foreground">
                  {Number(pkg.amount).toLocaleString()} so'm · {pkg.days} kun
                </div>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

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

      <SectionCard
        title="Promokodlar"
        description={`${promos.filter((p) => p.is_active).length} ta faol`}
      >
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
            value={announcement.title}
            onChange={(e) => setAnnouncement((p) => ({ ...p, title: e.target.value }))}
            className="w-full h-11 px-4 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
          />
          <textarea
            placeholder="Xabar matni..."
            rows={4}
            value={announcement.message}
            onChange={(e) => setAnnouncement((p) => ({ ...p, message: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {clients.length} ta mijozga yuboriladi
            </div>
            <button
              onClick={async () => {
                if (!announcement.message.trim()) {
                  toast.error("Xabar matni bo'sh.");
                  return;
                }
                const ok = await sendAnnouncement({
                  title: announcement.title.trim() || "Barber xabari",
                  message: announcement.message.trim(),
                });
                if (ok) {
                  toast.success("Xabar yuborildi.");
                  setAnnouncement({ title: "", message: "" });
                } else {
                  toast.error("Xabar yuborilmadi.");
                }
              }}
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

function Hero({
  icon,
  title,
  desc,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:border-foreground/30 transition-colors">
      <div className="size-10 rounded-lg bg-foreground text-background flex items-center justify-center mb-3">
        {icon}
      </div>
      <div className="font-heading font-medium">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{desc}</div>
      <button className="mt-4 text-sm font-medium underline-offset-4 hover:underline">
        {cta} →
      </button>
    </div>
  );
}
