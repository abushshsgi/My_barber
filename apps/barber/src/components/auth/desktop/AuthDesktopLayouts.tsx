import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { AuthDesktopHero } from "@/components/auth/desktop/AuthDesktopHero";
import type { SignupFlow } from "@/lib/auth-ui";
import type { AuthDesktopVariant } from "@/lib/auth-desktop-variant";
import { pageEnter } from "@/lib/motion-presets";
import { cn } from "@/lib/utils";

type ShellProps = {
  flow: SignupFlow | null;
  children: ReactNode;
};

type LayoutProps = ShellProps & {
  variant: AuthDesktopVariant;
};

const PARTNER_STATS = [
  { value: "2.4k+", label: "Faol barberlar" },
  { value: "18k+", label: "Oylik bronlar" },
  { value: "4.9", label: "O'rtacha reyting" },
];

function FormPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col justify-center", className)}>{children}</div>;
}

/** 01 — Qora chap panel + oq forma (klassik split). */
function SplitLayout({ flow, children }: ShellProps) {
  return (
    <motion.div
      {...pageEnter}
      className="mx-auto grid w-full max-w-[980px] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl md:grid-cols-[1.08fr_0.92fr]"
    >
      <div className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-10 text-zinc-100 md:flex">
        <div className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="relative">
          <AuthDesktopHero flow={flow} tone="dark" />
        </div>
        <div className="relative grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
          {PARTNER_STATS.map((s) => (
            <div key={s.label}>
              <p className="text-lg font-bold tabular-nums text-amber-300">{s.value}</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                {s.label}
              </p>
            </div>
          ))}
        </div>
        <p className="relative text-xs text-zinc-500">MySaloon Partner · partner.mysaloon.uz</p>
      </div>
      <FormPanel className="p-8 lg:p-10">{children}</FormPanel>
    </motion.div>
  );
}

/** 02 — Gradient fon + markazda shisha karta. */
function GlassLayout({ flow, children }: ShellProps) {
  return (
    <div className="relative flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.75_0.12_75)_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_oklch(0.55_0.04_260)_0%,_transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,oklch(0.98_0.01_90),oklch(0.94_0.02_260))]" />
      <motion.div
        {...pageEnter}
        className="relative w-full max-w-[480px] overflow-hidden rounded-[28px] border border-white/60 bg-white/70 p-8 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.25)] backdrop-blur-2xl lg:p-10"
      >
        <AuthDesktopHero flow={flow} tone="muted" compact />
        <div className="mt-8">{children}</div>
      </motion.div>
    </div>
  );
}

/** 03 — Keng editorial: forma chapda, katta hero o‘ngda. */
function EditorialLayout({ flow, children }: ShellProps) {
  return (
    <motion.div
      {...pageEnter}
      className="mx-auto grid w-full max-w-[1120px] gap-0 overflow-hidden rounded-[32px] border border-border bg-card shadow-xl lg:grid-cols-[minmax(0,420px)_1fr]"
    >
      <FormPanel className="border-b border-border p-8 lg:border-b-0 lg:border-r lg:p-10">
        <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Partner kirish
        </p>
        {children}
      </FormPanel>
      <div className="relative hidden min-h-[520px] flex-col justify-between overflow-hidden bg-zinc-100 p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-12deg, transparent, transparent 28px, oklch(0.55 0.02 80 / 0.12) 28px, oklch(0.55 0.02 80 / 0.12) 29px)",
          }}
        />
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-amber-300/40 blur-3xl" />
        <div className="relative">
          <AuthDesktopHero flow={flow} tone="muted" />
        </div>
        <div className="relative space-y-4">
          <blockquote className="max-w-md text-2xl font-semibold leading-snug tracking-tight text-zinc-900">
            «Mijozlar oqimini boshqarish endi telefon emas — tizim orqali.»
          </blockquote>
          <p className="text-sm text-zinc-600">Salon egalari va mustaqil barberlar uchun.</p>
        </div>
        <div className="relative flex gap-8">
          {PARTNER_STATS.slice(0, 2).map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold tabular-nums">{s.value}</p>
              <p className="mt-1 text-xs font-medium text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/** 04 — Minimal oq: ixcham markaziy karta. */
function MinimalLayout({ flow, children }: ShellProps) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-16">
      <motion.div
        {...pageEnter}
        className="w-full max-w-[440px]"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
            <span className="text-sm font-bold tracking-tight">MS</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">MySaloon Partner</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {flow ? "Davom eting" : "Kabinetga kiring yoki ro'yxatdan o'ting"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">{children}</div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Xavfsiz autentifikatsiya · SSL shifrlangan
        </p>
      </motion.div>
    </div>
  );
}

/** 05 — Amber studio: gradient + suzuvchi forma paneli. */
function StudioLayout({ flow, children }: ShellProps) {
  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden px-6 py-12 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-600 to-zinc-900" />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative mx-auto grid w-full max-w-[1100px] items-center gap-10 lg:grid-cols-[1fr_minmax(0,440px)] lg:gap-16">
        <div className="hidden text-white lg:block">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-100/80">
            Barber studio
          </p>
          <div className="mt-6 max-w-lg">
            <AuthDesktopHero flow={flow} tone="dark" />
          </div>
          <ul className="mt-10 space-y-3 text-sm text-amber-50/90">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-amber-200" />
              Bronlar va kalendar real vaqtda
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-amber-200" />
              Mijozlar va chat bir joyda
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-amber-200" />
              Daromad va statistika
            </li>
          </ul>
        </div>
        <motion.div
          {...pageEnter}
          className="rounded-[28px] border border-white/20 bg-white p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.45)] lg:p-10"
        >
          <div className="mb-6 lg:hidden">
            <AuthDesktopHero flow={flow} tone="muted" compact />
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

export function AuthDesktopLayout({ variant, flow, children }: LayoutProps) {
  switch (variant) {
    case "glass":
      return <GlassLayout flow={flow}>{children}</GlassLayout>;
    case "editorial":
      return <EditorialLayout flow={flow}>{children}</EditorialLayout>;
    case "minimal":
      return <MinimalLayout flow={flow}>{children}</MinimalLayout>;
    case "studio":
      return <StudioLayout flow={flow}>{children}</StudioLayout>;
    case "split":
    default:
      return <SplitLayout flow={flow}>{children}</SplitLayout>;
  }
}
