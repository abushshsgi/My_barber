import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { cn } from "@/lib/utils";
import { createSupportTicket, fetchSupportTickets } from "@/lib/api/support";
import { authQueryEnabled } from "@/lib/auth-query";
import { getAuthUserId } from "@/lib/auth-user";

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
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const userId = getAuthUserId();
  const qc = useQueryClient();

  const ticketsQ = useQuery({
    queryKey: ["support", "tickets", userId],
    queryFn: fetchSupportTickets,
    enabled: authQueryEnabled(!!userId),
  });

  const createTicket = useMutation({
    mutationFn: () => createSupportTicket({ subject: subject.trim(), body: body.trim() }),
    onSuccess: () => {
      toast.success("Murojaat yuborildi");
      setSubject("");
      setBody("");
      void qc.invalidateQueries({ queryKey: ["support", "tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <ProfileSubpageLayout title="Yordam">
      <ProfileSubpageCard className="mb-6 border-none bg-transparent p-0 shadow-none">
        <h2 className="text-base font-bold tracking-tight">Bizga qanday yordam kerak?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tez-tez so'raladigan savollarni quyida toping yoki biz bilan bog'laning.
        </p>
      </ProfileSubpageCard>

      {userId ? (
        <ProfileSubpageCard className="mb-6 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Murojaat yuborish
          </p>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Mavzu"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Xabar matni"
            rows={4}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            disabled={!subject.trim() || createTicket.isPending}
            onClick={() => createTicket.mutate()}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-bold text-background disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Yuborish
          </button>
          {(ticketsQ.data?.length ?? 0) > 0 ? (
            <ul className="mt-2 space-y-2 border-t border-border pt-3">
              {ticketsQ.data?.map((t) => (
                <li key={t.id} className="rounded-lg bg-surface/50 px-3 py-2 text-sm">
                  <p className="font-bold">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">{t.status}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </ProfileSubpageCard>
      ) : (
        <ProfileSubpageCard className="mb-6">
          <p className="text-sm text-muted-foreground">
            Murojaat yuborish uchun{" "}
            <Link to="/auth" className="font-bold text-foreground underline">
              tizimga kiring
            </Link>
            .
          </p>
        </ProfileSubpageCard>
      )}

      <div className="space-y-2">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <ProfileSubpageCard key={i} className="overflow-hidden p-0">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              >
                <span className="text-sm font-bold">{item.q}</span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")}
                />
              </button>
              {isOpen && (
                <p className="border-t border-border bg-surface/40 px-4 py-4 text-sm text-muted-foreground">
                  {item.a}
                </p>
              )}
            </ProfileSubpageCard>
          );
        })}
      </div>

      <ProfileSubpageCard className="mt-6 border-foreground bg-foreground text-background">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/70">
          Bog'lanish
        </p>
        <p className="mt-2 text-base font-bold">support@mysaloon.uz</p>
        <p className="mt-1 text-sm text-background/80">+998 71 123 45 67</p>
      </ProfileSubpageCard>
    </ProfileSubpageLayout>
  );
}
