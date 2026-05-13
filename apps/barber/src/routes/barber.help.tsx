import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, MessageSquare, Send } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/barber/primitives";
import { useBarberContext } from "@/components/barber/BarberContext";
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
  const { sendSupportTicket } = useBarberContext();
  const [open, setOpen] = useState<number | null>(0);
  const [message, setMessage] = useState("");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <PageHeader title="Yordam markazi" description="Tez-tez so'raladigan savollar va support." />

      <SectionCard
        title="Aloqa"
        description="Telefon va email manzillari platforma administratori tomonidan belgilanadi. Hozircha texnik yordam faqat pastdagi forma orqali."
      >
        <p className="text-sm text-muted-foreground">
          Xabar serverga yuboriladi — javobni administrator yoki support jarayoni orqali olasiz.
        </p>
      </SectionCard>

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
                  <div className="pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</div>
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
                onClick={async () => {
                  if (!message.trim()) return;
                  const ok = await sendSupportTicket({
                    subject: "Barber panel support",
                    message: message.trim(),
                  });
                  if (ok) {
                    toast.success("Murojaatingiz yuborildi");
                    setMessage("");
                  } else {
                    toast.error("Murojaat yuborilmadi");
                  }
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
