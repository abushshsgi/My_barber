import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, MessageSquare, Mail, Phone, BookOpen, Send } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/barber/primitives";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/barber/help")({
  component: HelpPage,
});

const FAQ = [
  {
    q: "Qanday qilib yangi xizmat qo'shaman?",
    a: "Profil sahifasiga o'ting va 'Yangi qo'shish' tugmasini bosing. Xizmat nomi, narxi va davomiyligini kiriting.",
  },
  {
    q: "Bron qanday bekor qilinadi?",
    a: "Bronlar sahifasidan kerakli bronni toping va 'X' tugmasini bosing. Mijozga avtomatik xabar yuboriladi.",
  },
  {
    q: "Pul qachon hisobimga tushadi?",
    a: "Haftalik to'lovlar payshanba kuni amalga oshiriladi. Daromad sahifasida balansingizni ko'rishingiz mumkin.",
  },
  {
    q: "Promokod qanday yaratiladi?",
    a: "Marketing sahifasida 'Yangi promokod' tugmasini bosing. Kod, chegirma va amal qilish muddatini kiriting.",
  },
  {
    q: "Salondan chiqib mustaqil bo'lish mumkinmi?",
    a: "Ha. Sozlamalar > Akkaunt bo'limidan salonni tark etish so'rovini yuboring. Salon administratori tasdiqlaganidan keyin mustaqil rejimga o'tasiz.",
  },
];

function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);
  const [message, setMessage] = useState("");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <PageHeader title="Yordam markazi" description="Tez-tez so'raladigan savollar va support." />

      {/* Contact channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Channel icon={<Phone className="size-5" />} label="Telefon" value="+998 71 200 00 00" hint="9:00 — 21:00" />
        <Channel icon={<Mail className="size-5" />} label="Email" value="support@shearhq.uz" hint="24 soat ichida javob" />
        <Channel icon={<BookOpen className="size-5" />} label="Hujjatlar" value="docs.shearhq.uz" hint="Qo'llanmalar" />
      </div>

      {/* FAQ */}
      <SectionCard title="Tez-tez so'raladigan savollar">
        <div className="divide-y divide-border -my-2">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="py-1">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full py-3 flex items-center justify-between gap-3 text-left hover:text-foreground transition-colors"
                >
                  <span className="text-sm font-medium">{item.q}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform shrink-0",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="pb-4 text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Support form */}
      <SectionCard
        title="Support bilan bog'lanish"
        description="Savolingizni yozing — odatda 1 soat ichida javob beramiz."
      >
        <div className="flex gap-3">
          <div className="size-10 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
            <MessageSquare className="size-5" />
          </div>
          <div className="flex-1 space-y-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Muammoni batafsil yozing..."
              className="w-full px-4 py-3 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm resize-none"
            />
            <div className="flex items-center justify-end">
              <button
                onClick={() => {
                  if (!message.trim()) return;
                  toast.success("Murojaatingiz yuborildi");
                  setMessage("");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
              >
                <Send className="size-4" />
                Yuborish
              </button>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function Channel({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:border-foreground/30 transition-colors">
      <div className="size-10 rounded-lg bg-muted flex items-center justify-center mb-3">
        {icon}
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-heading font-medium mt-1">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}
