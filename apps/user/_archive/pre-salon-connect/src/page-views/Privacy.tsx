"use client";

import { Bell, LockKeyhole, MapPin, ShieldCheck, UserCheck } from "lucide-react";
import { Link } from "@/navigation";
import { NeoPage, NeoSection } from "@/components/neo/NeoPrimitives";

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
    <NeoPage className="pb-8">
      <header className="px-5 pt-safe">
        <div className="pt-3">
          <span className="grid h-12 w-12 place-items-center rounded-lg border-2 border-border bg-primary text-primary-foreground shadow-luxury">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <p className="label-eyebrow mt-5">Maxfiylik va xavfsizlik</p>
          <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-foreground">
            Mijoz maʼlumotlari aniq oqimlarda ishlatiladi
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Sahifa ilovada hozir ishlayotgan backend integratsiyalariga asoslangan qisqa izoh beradi.
          </p>
        </div>
      </header>

      <main className="px-5 pt-5">
        <NeoSection title="Nima saqlanadi va nima uchun" eyebrow="Maxfiylik">
          <div className="space-y-3">
          {rows.map(({ icon: Icon, title, body }) => (
            <article key={title} className="neo-panel p-4">
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 border-border bg-accent text-accent-foreground">
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
        </NeoSection>

        <Link
          to="/settings"
          className="neo-cta mt-5 grid h-12 place-items-center bg-primary text-sm font-bold text-primary-foreground"
        >
          Sozlamalarni ochish
        </Link>
      </main>
    </NeoPage>
  );
}
