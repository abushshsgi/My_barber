import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Heart, Image as ImageIcon, Share2, X } from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { PageHeader, StatCard } from "@/components/barber/primitives";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/barber/portfolio")({
  component: PortfolioPage,
});

function PortfolioPage() {
  const { portfolio, uploadPortfolio } = useBarberContext();
  const [active, setActive] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState<{ title: string; service: string; file: File | null }>({
    title: "",
    service: "",
    file: null,
  });

  const services = Array.from(new Set(portfolio.map((p) => p.service)));
  const items = portfolio.filter((p) => filter === "all" || p.service === filter);
  const totalLikes = portfolio.reduce((s, p) => s + p.likes, 0);
  const activeItem = portfolio.find((p) => p.id === active);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Portfolio"
        description="Eng yaxshi ishlaringizni mijozlarga ko'rsating."
        actions={
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
          >
            <Plus className="size-4" />
            Rasm yuklash
          </button>
        }
      />
      {showUpload && (
        <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Sarlavha" className="h-10 px-3 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm" />
          <input value={form.service} onChange={(e) => setForm((p) => ({ ...p, service: e.target.value }))} placeholder="Xizmat nomi" className="h-10 px-3 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm" />
          <input type="file" accept="image/*" onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))} className="h-10 px-2 py-2 rounded-lg bg-muted/40 border border-border text-sm" />
          <button
            onClick={async () => {
              if (!form.file) {
                toast.error("Rasm tanlang.");
                return;
              }
              const ok = await uploadPortfolio({
                file: form.file,
                title: form.title.trim() || "Portfolio",
                service: form.service.trim() || "Xizmat",
              });
              if (ok) {
                toast.success("Rasm yuklandi.");
                setShowUpload(false);
                setForm({ title: "", service: "", file: null });
              } else {
                toast.error("Yuklashda xato.");
              }
            }}
            className="h-10 px-3 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
          >
            Saqlash
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<ImageIcon className="size-4" />} label="Ishlar" value={portfolio.length} />
        <StatCard icon={<Heart className="size-4" />} label="Jami yoqtirishlar" value={totalLikes} />
        <StatCard label="O'rta yoqtirish" value={Math.round(totalLikes / Math.max(1, portfolio.length))} />
        <StatCard label="Xizmatlar" value={services.length} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            filter === "all"
              ? "bg-foreground text-background border-foreground"
              : "bg-card border-border text-muted-foreground hover:text-foreground",
          )}
        >
          Hammasi
        </button>
        {services.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              filter === s
                ? "bg-foreground text-background border-foreground"
                : "bg-card border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border shadow-card hover:shadow-matte transition-shadow"
          >
            <img
              src={p.image}
              alt={p.title}
              className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-3 text-left text-background opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="font-heading text-sm font-medium truncate">{p.title}</div>
              <div className="text-xs opacity-80 truncate">{p.service}</div>
              <div className="flex items-center gap-1 mt-1 text-xs">
                <Heart className="size-3 fill-current" />
                {p.likes}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {activeItem && (
        <div
          onClick={() => setActive(null)}
          className="fixed inset-0 bg-foreground/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl overflow-hidden max-w-3xl w-full shadow-card"
          >
            <div className="relative aspect-[4/3] bg-muted">
              <img src={activeItem.image} alt={activeItem.title} className="size-full object-cover" />
              <button
                onClick={() => setActive(null)}
                className="absolute top-3 right-3 size-9 rounded-full bg-background/90 flex items-center justify-center hover:bg-background"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5 flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-semibold">{activeItem.title}</h3>
                <p className="text-sm text-muted-foreground">{activeItem.service} · {activeItem.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm">
                  <Heart className="size-4" />
                  {activeItem.likes}
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm">
                  <Share2 className="size-4" />
                  Ulashish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
