import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  AuthDesktopOnboardingAside,
  type AsideTheme,
} from "@/components/auth/desktop/AuthDesktopOnboardingAside";
import type { SignupFlow } from "@/lib/auth-ui";
import type { AuthDesktopVariant } from "@/lib/auth-desktop-variant";
import { pageEnter } from "@/lib/motion-presets";
import { cn } from "@/lib/utils";

export type AuthDesktopLayoutProps = {
  flow: SignupFlow | null;
  tab: "login" | "signup";
  signupStep: number;
  children: ReactNode;
  variant: AuthDesktopVariant;
};

type ShellProps = Omit<AuthDesktopLayoutProps, "variant">;

const STATS = [
  { value: "2.4k+", label: "Faol barberlar" },
  { value: "18k+", label: "Oylik bronlar" },
];

function FormCol({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col justify-center", className)}>{children}</div>;
}

function AsideCol({
  theme,
  presentation,
  flow,
  tab,
  signupStep,
  className,
  children,
}: {
  theme: AsideTheme;
  presentation?: "steps" | "quote" | "timeline" | "cards";
  flow: SignupFlow | null;
  tab: "login" | "signup";
  signupStep: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col justify-between", className)}>
      <AuthDesktopOnboardingAside
        flow={flow}
        tab={tab}
        signupStep={signupStep}
        theme={theme}
        presentation={presentation}
      />
      {children}
    </div>
  );
}

/* ─── Original 01–05 ─── */

function SplitLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <motion.div
      {...pageEnter}
      className="mx-auto grid w-full max-w-[980px] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl lg:grid-cols-[1.08fr_0.92fr]"
    >
      <AsideCol
        theme="dark"
        flow={flow}
        tab={tab}
        signupStep={signupStep}
        className="relative hidden overflow-hidden bg-zinc-950 p-10 text-zinc-100 lg:flex"
      >
        <div className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="mt-auto grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-lg font-bold text-amber-300">{s.value}</p>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>
      </AsideCol>
      <FormCol className="p-8 lg:p-10">{children}</FormCol>
    </motion.div>
  );
}

function GlassLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <div className="relative flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,oklch(0.98_0.01_90),oklch(0.92_0.03_260))]" />
      <motion.div
        {...pageEnter}
        className="relative w-full max-w-[500px] rounded-[28px] border border-white/60 bg-white/75 p-8 shadow-2xl backdrop-blur-2xl lg:p-10"
      >
        <AuthDesktopOnboardingAside flow={flow} tab={tab} signupStep={signupStep} theme="warm" />
        <div className="mt-8">{children}</div>
      </motion.div>
    </div>
  );
}

function EditorialLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <motion.div
      {...pageEnter}
      className="mx-auto grid w-full max-w-[1120px] overflow-hidden rounded-[32px] border border-border bg-card shadow-xl lg:grid-cols-[minmax(0,420px)_1fr]"
    >
      <FormCol className="border-b border-border p-8 lg:border-b-0 lg:border-r lg:p-10">{children}</FormCol>
      <AsideCol
        theme="warm"
        presentation="quote"
        flow={flow}
        tab={tab}
        signupStep={signupStep}
        className="relative hidden min-h-[540px] overflow-hidden bg-zinc-100 p-10 lg:flex"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-12deg, transparent, transparent 28px, oklch(0.55 0.02 80 / 0.12) 28px, oklch(0.55 0.02 80 / 0.12) 29px)",
          }}
        />
      </AsideCol>
    </motion.div>
  );
}

function MinimalLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-16">
      <motion.div {...pageEnter} className="w-full max-w-[440px]">
        <AuthDesktopOnboardingAside flow={flow} tab={tab} signupStep={signupStep} theme="light" presentation="steps" />
        <div className="mt-8 rounded-2xl border border-border bg-card p-8 shadow-sm">{children}</div>
      </motion.div>
    </div>
  );
}

function StudioLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden px-6 py-12 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-600 to-zinc-900" />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative mx-auto grid w-full max-w-[1100px] items-center gap-10 lg:grid-cols-[1fr_minmax(0,440px)] lg:gap-16">
        <AsideCol theme="amber" flow={flow} tab={tab} signupStep={signupStep} className="hidden text-white lg:flex" />
        <motion.div
          {...pageEnter}
          className="rounded-[28px] border border-white/20 bg-white p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.45)] lg:p-10"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

/* ─── New 06–10 (Editorial family) ─── */

function EditorialInkLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <motion.div
      {...pageEnter}
      className="mx-auto grid w-full max-w-[1100px] overflow-hidden rounded-[32px] border border-stone-800 bg-stone-950 shadow-2xl lg:grid-cols-[1fr_minmax(0,400px)]"
    >
      <AsideCol
        theme="ink"
        presentation="timeline"
        flow={flow}
        tab={tab}
        signupStep={signupStep}
        className="relative hidden p-10 lg:flex"
      />
      <FormCol className="bg-stone-50 p-8 lg:p-10">{children}</FormCol>
    </motion.div>
  );
}

function EditorialSandLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#f5f0e8] px-6 py-12">
      <motion.div
        {...pageEnter}
        className="mx-auto grid max-w-[1080px] gap-8 lg:grid-cols-[1fr_420px] lg:items-center"
      >
        <AsideCol theme="sand" presentation="cards" flow={flow} tab={tab} signupStep={signupStep} className="p-4 lg:p-6" />
        <div className="rounded-[24px] border border-stone-200 bg-white p-8 shadow-lg lg:p-10">{children}</div>
      </motion.div>
    </div>
  );
}

function EditorialGridLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <motion.div
      {...pageEnter}
      className="mx-auto grid w-full max-w-[1140px] overflow-hidden rounded-[32px] border border-border bg-card lg:grid-cols-[400px_1fr]"
    >
      <FormCol className="order-2 border-t border-border p-8 lg:order-1 lg:border-r lg:border-t-0 lg:p-10">
        {children}
      </FormCol>
      <AsideCol
        theme="warm"
        presentation="cards"
        flow={flow}
        tab={tab}
        signupStep={signupStep}
        className="relative order-1 min-h-[320px] overflow-hidden bg-zinc-50 p-8 lg:order-2 lg:min-h-[560px] lg:p-10"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.75 0.02 80 / 0.2) 1px, transparent 1px), linear-gradient(90deg, oklch(0.75 0.02 80 / 0.2) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </AsideCol>
    </motion.div>
  );
}

function EditorialQuoteLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-zinc-100 px-6 py-12">
      <motion.div
        {...pageEnter}
        className="grid w-full max-w-[1120px] gap-0 overflow-hidden rounded-[32px] bg-white shadow-xl lg:grid-cols-[1.15fr_0.85fr]"
      >
        <AsideCol
          theme="light"
          presentation="quote"
          flow={flow}
          tab={tab}
          signupStep={signupStep}
          className="border-b border-border bg-zinc-50 p-10 lg:border-b-0 lg:border-r"
        />
        <FormCol className="p-8 lg:p-10">{children}</FormCol>
      </motion.div>
    </div>
  );
}

function EditorialStepsLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <motion.div
      {...pageEnter}
      className="mx-auto grid w-full max-w-[1120px] overflow-hidden rounded-[32px] border border-border lg:grid-cols-[minmax(0,380px)_1fr]"
    >
      <FormCol className="bg-white p-8 lg:p-10">{children}</FormCol>
      <AsideCol
        theme="warm"
        presentation="timeline"
        flow={flow}
        tab={tab}
        signupStep={signupStep}
        className="relative hidden bg-gradient-to-br from-amber-50 to-zinc-100 p-10 lg:flex"
      />
    </motion.div>
  );
}

/* ─── New 11–15 (Studio family) ─── */

function StudioCopperLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-gradient-to-br from-orange-700 via-orange-600 to-zinc-900 px-6 py-12">
      <div className="relative mx-auto grid max-w-[1080px] items-center gap-12 lg:grid-cols-[1fr_420px]">
        <AsideCol theme="copper" flow={flow} tab={tab} signupStep={signupStep} className="text-white" />
        <motion.div {...pageEnter} className="rounded-[28px] bg-white p-8 shadow-2xl lg:p-10">
          {children}
        </motion.div>
      </div>
    </div>
  );
}

function StudioMidnightLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-amber-900 px-6 py-12">
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-[1080px] items-center gap-10 lg:grid-cols-[420px_1fr]">
        <motion.div {...pageEnter} className="order-2 rounded-[28px] bg-white p-8 lg:order-1 lg:p-10">
          {children}
        </motion.div>
        <AsideCol
          theme="midnight"
          presentation="steps"
          flow={flow}
          tab={tab}
          signupStep={signupStep}
          className="order-1 lg:order-2"
        />
      </div>
    </div>
  );
}

function StudioFrameLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-gradient-to-br from-amber-500 to-zinc-800 p-8">
      <motion.div
        {...pageEnter}
        className="grid w-full max-w-[1000px] overflow-hidden rounded-[32px] border-4 border-white/25 bg-white/95 shadow-2xl lg:grid-cols-[1fr_400px]"
      >
        <AsideCol theme="amber" flow={flow} tab={tab} signupStep={signupStep} className="bg-gradient-to-br from-amber-500 to-amber-700 p-10 text-white" />
        <FormCol className="p-8 lg:p-10">{children}</FormCol>
      </motion.div>
    </div>
  );
}

function StudioLoungeLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-zinc-950 px-6 py-12">
      <div className="mx-auto grid max-w-[1100px] gap-8 lg:grid-cols-[1fr_400px] lg:items-center">
        <AsideCol
          theme="lounge"
          presentation="timeline"
          flow={flow}
          tab={tab}
          signupStep={signupStep}
          className="rounded-[28px] border border-amber-900/40 bg-gradient-to-b from-zinc-900 to-zinc-950 p-10"
        />
        <motion.div
          {...pageEnter}
          className="rounded-[24px] bg-white p-8 shadow-xl lg:p-10"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

function StudioSpotlightLayout({ flow, tab, signupStep, children }: ShellProps) {
  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-zinc-900">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 30% 40%, oklch(0.72 0.14 75 / 0.45), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, oklch(0.35 0.02 280 / 0.5), transparent)",
        }}
      />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-[1100px] items-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <AsideCol theme="amber" presentation="quote" flow={flow} tab={tab} signupStep={signupStep} />
          <motion.div {...pageEnter} className="rounded-[28px] bg-white p-8 shadow-2xl lg:p-10">
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function AuthDesktopLayout({ variant, flow, tab, signupStep, children }: AuthDesktopLayoutProps) {
  const props: ShellProps = { flow, tab, signupStep, children };

  switch (variant) {
    case "glass":
      return <GlassLayout {...props} />;
    case "editorial":
      return <EditorialLayout {...props} />;
    case "minimal":
      return <MinimalLayout {...props} />;
    case "studio":
      return <StudioLayout {...props} />;
    case "editorial-ink":
      return <EditorialInkLayout {...props} />;
    case "editorial-sand":
      return <EditorialSandLayout {...props} />;
    case "editorial-grid":
      return <EditorialGridLayout {...props} />;
    case "editorial-quote":
      return <EditorialQuoteLayout {...props} />;
    case "editorial-steps":
      return <EditorialStepsLayout {...props} />;
    case "studio-copper":
      return <StudioCopperLayout {...props} />;
    case "studio-midnight":
      return <StudioMidnightLayout {...props} />;
    case "studio-frame":
      return <StudioFrameLayout {...props} />;
    case "studio-lounge":
      return <StudioLoungeLayout {...props} />;
    case "studio-spotlight":
      return <StudioSpotlightLayout {...props} />;
    case "split":
    default:
      return <SplitLayout {...props} />;
  }
}
