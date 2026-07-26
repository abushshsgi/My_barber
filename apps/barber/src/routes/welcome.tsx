import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CalendarDays, Megaphone, Rocket, Users } from "lucide-react";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { getBarberAccessToken } from "@/lib/api";
import { resolveBarberEntryPath } from "@/lib/onboarding-redirect";

const DEMO_PARTNER = "https://demo.partner.mysaloon.uz";

export const Route = createFileRoute("/welcome")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { bootstrapBarberSession } = await import("@/lib/barber-auth-session");
    const sessionOk = await bootstrapBarberSession();
    if (!sessionOk || !getBarberAccessToken()) return;
    const next = await resolveBarberEntryPath();
    if (next !== "/auth" && next !== "/welcome") {
      throw redirect({ to: next });
    }
  },
  component: PartnerWelcomePage,
  head: () => ({
    meta: [
      { title: "MySaloon Partner — salonlar uchun" },
      {
        name: "description",
        content: "Bo'sh o'rinlar → to'liq kalendar. Bronlar, mijozlar va TOP boost bir joyda.",
      },
    ],
  }),
});

function PartnerWelcomePage() {
  return (
    <div className="min-h-[100dvh] bg-[#f4f4f5] text-zinc-900">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MysaloonLogo size="md" subtitle="Partner" />
          <Link
            to="/auth"
            search={{ tab: "login" }}
            className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
          >
            Kirish
          </Link>
        </div>

        <main className="mt-16 flex flex-1 flex-col justify-center sm:mt-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            Salon egalari uchun
          </p>
          <h1 className="mt-3 max-w-xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Bo&apos;sh o&apos;rinlar →{" "}
            <span className="text-zinc-600">to&apos;liq kalendar</span>
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-600 sm:text-lg">
            Onlayn bron, mijozlar bazasi va marketing boost — komissiya modeli, yashirin obuna yo&apos;q.
            Birinchi bronni bugun qabul qiling.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/auth"
              search={{ tab: "signup" }}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-900 px-6 text-[15px] font-bold text-white hover:bg-zinc-800"
            >
              Bepul boshlash
            </Link>
            <a
              href={DEMO_PARTNER}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-[15px] font-bold text-zinc-800 hover:bg-zinc-50"
            >
              Demo ko&apos;rish
            </a>
          </div>

          <ul className="mt-12 grid gap-4 sm:grid-cols-3">
            {(
              [
                {
                  Icon: CalendarDays,
                  title: "Bronlar",
                  desc: "Kalendar va onlayn band qilish",
                },
                {
                  Icon: Users,
                  title: "Mijozlar",
                  desc: "Baza, chat va qayta chaqirish",
                },
                {
                  Icon: Megaphone,
                  title: "TOP boost",
                  desc: "Xaritada yuqoriroq ko‘rinish",
                },
              ] as const
            ).map(({ Icon, title, desc }) => (
              <li
                key={title}
                className="rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-4 shadow-sm"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-zinc-900 text-white">
                  <Icon className="size-4" strokeWidth={2.25} />
                </span>
                <p className="mt-3 text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{desc}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3.5">
            <Rocket className="size-5 shrink-0 text-zinc-700" />
            <p className="text-sm text-zinc-600">
              <span className="font-bold text-zinc-900">0 so&apos;m setup</span>
              {" · "}komissiya bronlardan · TOP boost ixtiyoriy (99k / 299k)
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
