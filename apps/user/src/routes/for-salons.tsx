import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Megaphone, Rocket, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { createSupportTicket } from "@/lib/api/support";
import { partnerDemoUrl, partnerSignupUrl, partnerWelcomeUrl } from "@/lib/partner-origin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/for-salons")({
  head: () => ({
    meta: [
      { title: "Salon egalari uchun — mysaloon.uz" },
      {
        name: "description",
        content: "MySaloon Partner: onlayn bron, mijozlar va TOP boost. Bepul boshlash.",
      },
    ],
  }),
  component: ForSalonsPage,
});

function ForSalonsPage() {
  const { t } = useTranslation();
  const [salonName, setSalonName] = useState("");
  const [city, setCity] = useState("");
  const [seats, setSeats] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  const onLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonName.trim() || !city.trim()) {
      toast.error("Salon nomi va shahar kerak");
      return;
    }
    setSending(true);
    try {
      await createSupportTicket({
        subject: `[Salon lead] ${salonName.trim()} — ${city.trim()}`,
        body: [
          "Salon egasi lead (for-salons):",
          `Salon: ${salonName.trim()}`,
          `Shahar: ${city.trim()}`,
          seats.trim() ? `O'rinlar: ${seats.trim()}` : null,
          phone.trim() ? `Telefon: ${phone.trim()}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      });
      toast.success("So‘rov yuborildi — tez orada bog‘lanamiz");
      setSalonName("");
      setCity("");
      setSeats("");
      setPhone("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yuborib bo‘lmadi — Partner orqali boshlang");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="inline-flex">
            <MysaloonLogo size="md" />
          </Link>
          <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            {t("common.back", { defaultValue: "Bosh sahifa" })}
          </Link>
        </div>

        <p className="mt-12 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("footer.business", { defaultValue: "Salon egalari uchun" })}
        </p>
        <h1 className="mt-3 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Bo&apos;sh o&apos;rinlar → to&apos;liq kalendar
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          MySaloon Partner — onlayn bron, mijozlar va marketing. Setup bepul, komissiya bronlardan.
          TOP boost ixtiyoriy.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <a
            href={partnerSignupUrl("owner")}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-foreground px-5 text-sm font-bold text-background"
          >
            Bepul boshlash
          </a>
          <a
            href={partnerWelcomeUrl()}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-border px-5 text-sm font-bold"
          >
            Partner sahifa
          </a>
          <a
            href={partnerDemoUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-border px-5 text-sm font-bold text-muted-foreground"
          >
            Demo ko&apos;rish
          </a>
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-3">
          {(
            [
              { Icon: CalendarDays, title: "Bronlar", desc: "Kalendar va onlayn band" },
              { Icon: Users, title: "Mijozlar", desc: "Baza, chat, qayta chaqirish" },
              { Icon: Megaphone, title: "TOP boost", desc: "99k / 7 kun · 299k / 30 kun" },
            ] as const
          ).map(({ Icon, title, desc }) => (
            <li key={title} className="rounded-2xl border border-border bg-card px-4 py-4">
              <span className="grid size-9 place-items-center rounded-xl bg-foreground text-background">
                <Icon className="size-4" strokeWidth={2.25} />
              </span>
              <p className="mt-3 text-sm font-bold">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </li>
          ))}
        </ul>

        <section className="mt-12 rounded-[24px] border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground text-background">
              <Rocket className="size-4" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Salon lead — qo‘ng‘iroq qiling</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                O‘zingiz ochishingiz mumkin yoki shu yerda qoldiring — manager bog‘lanadi.
              </p>
            </div>
          </div>

          <form onSubmit={onLead} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
              value={salonName}
              onChange={(e) => setSalonName(e.target.value)}
              placeholder="Salon nomi"
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Shahar"
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <input
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              placeholder="O‘rinlar (ixtiyoriy)"
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefon (ixtiyoriy)"
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={sending}
              className={cn(
                "sm:col-span-2 inline-flex h-12 items-center justify-center rounded-2xl bg-foreground text-sm font-bold text-background",
                sending && "opacity-60",
              )}
            >
              {sending ? "Yuborilmoqda…" : "So‘rov yuborish"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
