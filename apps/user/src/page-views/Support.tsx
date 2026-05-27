"use client";

import { CalendarDays, HelpCircle, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { Link } from "@/navigation";

const FAQ = [
  {
    q: "Bookingdan keyin chat nega ochiladi?",
    a: "Backend chatni faqat faol booking bor foydalanuvchi va barber juftligi uchun ochadi. Bu spam va begona xabarlarni to'xtatadi.",
  },
  {
    q: "Bronni qanday bekor qilaman?",
    a: "Bandlarim sahifasida kutilayotgan yoki tasdiqlangan booking kartasidan bekor qilish tugmasini bosing.",
  },
  {
    q: "Viloyat nima uchun kerak?",
    a: "Viloyat katalog va booking hudud tekshiruvini backend bilan bir xil ushlab, noto'g'ri hududdagi bandlarni kamaytiradi.",
  },
];

export default function Support() {
  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="relative overflow-hidden rounded-b-[32px] px-5 pb-8 pt-safe text-background"
        style={{ background: "var(--gradient-dark)" }}>
        <div
          aria-hidden
          className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-50 blur-3xl"
          style={{ background: "oklch(0.78 0.13 80 / 0.5)" }}
        />
        <div className="relative pt-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
            <HelpCircle className="h-6 w-6" />
          </span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-background/55">
            Yordam markazi
          </p>
          <h1 className="mt-1 font-display text-[26px] font-semibold tracking-tight">
            Muammo boʻlsa tez yordam
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-background/65">
            Eng koʻp uchraydigan savollar va real aloqa kanallari.
          </p>
        </div>
      </header>

      <main className="px-5 pt-5">
        <div className="grid gap-3">
          <Link
            to="/bookings"
            className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-soft"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted">
              <CalendarDays className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">Booking muammolari</span>
              <span className="block text-xs text-muted-foreground">Bandlarim sahifasidan holat va bekor qilish</span>
            </span>
          </Link>
          <a
            href="mailto:support@mysaloon.uz?subject=MySaloon%20user%20support"
            className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-soft"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted">
              <Mail className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">Email</span>
              <span className="block text-xs text-muted-foreground">support@mysaloon.uz</span>
            </span>
          </a>
          <Link
            to="/chat"
            className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-soft"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">Barber bilan chat</span>
              <span className="block text-xs text-muted-foreground">Faol booking bo'lsa yozishmalarni oching</span>
            </span>
          </Link>
        </div>

        <section className="mt-6">
          <p className="label-eyebrow mb-3">FAQ</p>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <article key={item.q} className="rounded-3xl border border-border bg-surface p-4 shadow-soft">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <div>
                    <h2 className="text-sm font-bold text-foreground">{item.q}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
