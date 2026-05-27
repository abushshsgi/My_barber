"use client";

import { Bell, LockKeyhole, MapPin, ShieldCheck, UserCheck } from "lucide-react";
import { Link } from "@/navigation";

const rows = [
  {
    icon: UserCheck,
    title: "Akkaunt ma'lumotlari",
    body: "Email, ism, telefon va viloyat faqat login, booking va hududga mos katalog uchun ishlatiladi.",
  },
  {
    icon: MapPin,
    title: "Joylashuv",
    body: "Xarita yaqin salon va barberlarni topish uchun brauzer geolokatsiyasidan foydalanadi. Ruxsat bermasangiz Toshkent markazi fallback sifatida olinadi.",
  },
  {
    icon: Bell,
    title: "Xabarnomalar",
    body: "Booking, chat va status o'zgarishlari backend notification servisi orqali keladi; unread holati ilovada sinxronlanadi.",
  },
  {
    icon: LockKeyhole,
    title: "Token xavfsizligi",
    body: "Mijoz, barber va admin tokenlari alohida kalitlarda saqlanadi. Chiqish tugmasi sessiya tokenlarini tozalaydi.",
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="px-5 pt-12">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-foreground text-background shadow-card">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <p className="mt-5 label-eyebrow">Maxfiylik va xavfsizlik</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
          Mijoz ma'lumotlari aniq oqimlarda ishlatiladi
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Sahifa ilovada hozir ishlayotgan backend integratsiyalariga asoslangan qisqa izoh beradi.
        </p>
      </header>

      <main className="px-5 pt-5">
        <div className="space-y-3">
          {rows.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-3xl border border-border bg-surface p-4 shadow-soft">
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-muted">
                  <Icon className="h-5 w-5 text-foreground" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-foreground">{title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <Link
          to="/settings"
          className="mt-5 grid h-12 place-items-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft"
        >
          Sozlamalarni ochish
        </Link>
      </main>
    </div>
  );
}
