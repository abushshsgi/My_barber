import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Yordam — mysaloon.uz" },
      { name: "description", content: "mysaloon.uz yordam markazi va tez-tez so'raladigan savollar." },
    ],
  }),
  component: Support,
});

const FAQ = [
  {
    q: "Qanday qilib salon band qilaman?",
    a: "Bosh sahifadan salonni tanlang, xizmat va vaqtni belgilang, so'ng tasdiqlang.",
  },
  {
    q: "Bekor qilsam, pul qaytariladimi?",
    a: "Ha, agar buyurtmadan 2 soat oldin bekor qilsangiz to'liq qaytariladi.",
  },
  {
    q: "Sartarosh bilan qanday bog'lanaman?",
    a: "Buyurtma tasdiqlangach Chat orqali bevosita yozishingiz mumkin.",
  },
  {
    q: "Sharhni qanday qoldiraman?",
    a: "Buyurtma yakunlangach Buyurtmalarim sahifasidan sharh yoza olasiz.",
  },
];

function Support() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="pb-8">
      <PageHeader showBack title="Yordam" />
      <div className="px-5">
        <h2 className="text-xl font-bold tracking-tight">Bizga qanday yordam kerak?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tez-tez so'raladigan savollarni quyida toping yoki biz bilan bog'laning.
        </p>

        <div className="mt-6 space-y-2">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="overflow-hidden rounded-2xl border border-border">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <span className="text-sm font-bold">{item.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen && (
                  <p className="border-t border-border bg-surface/40 px-4 py-4 text-sm text-muted-foreground">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl bg-foreground p-5 text-background">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
            Bog'lanish
          </p>
          <p className="mt-2 text-base font-bold">support@mysaloon.uz</p>
          <p className="mt-1 text-sm opacity-80">+998 71 123 45 67</p>
        </div>
      </div>
    </div>
  );
}
