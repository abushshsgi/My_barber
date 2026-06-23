import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { AuthDesktopFormChrome } from "@/components/auth/desktop/AuthDesktopFormChrome";
import { AuthDesktopHeader, AuthDesktopLogo } from "@/components/auth/desktop/AuthDesktopHeader";
import { AuthDesktopOnboardingAside } from "@/components/auth/desktop/AuthDesktopOnboardingAside";
import { GlowOrb, VariantVisual } from "@/components/auth/desktop/AuthDesktopVisuals";
import type { SignupFlow } from "@/lib/auth-ui";
import {
  DARK_FORM_SKIN,
  LIGHT_FORM_SKIN,
  VARIANT_ACCENT,
  type AuthAccent,
  type AuthDesktopVariant,
} from "@/lib/auth-desktop-variant";
import { pageEnter } from "@/lib/motion-presets";
import { cn } from "@/lib/utils";

export type AuthDesktopLayoutProps = {
  flow: SignupFlow | null;
  tab: "login" | "signup";
  signupStep: number;
  onTabChange: (tab: "login" | "signup") => void;
  children: ReactNode;
  variant: AuthDesktopVariant;
};

type ShellProps = Omit<AuthDesktopLayoutProps, "variant">;

function Form({
  accent,
  tab,
  signupStep,
  flow,
  children,
  dark = false,
  titleSize = "title" as const,
  showProgress = true,
  skin,
}: {
  accent: AuthAccent;
  tab: "login" | "signup";
  signupStep: number;
  flow: SignupFlow | null;
  children: ReactNode;
  dark?: boolean;
  titleSize?: "title" | "hero" | "compact";
  showProgress?: boolean;
  skin?: string;
}) {
  return (
    <div className={cn(skin)}>
      <AuthDesktopFormChrome
        tab={tab}
        signupStep={signupStep}
        flow={flow}
        accent={accent}
        dark={dark}
        titleSize={titleSize}
        showProgress={showProgress}
      >
        {children}
      </AuthDesktopFormChrome>
    </div>
  );
}

/* ═══ LINEAR family ═══ */

function LinearIndigoLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT["linear-indigo"];
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090b]">
      <VariantVisual variant="linear-indigo" />
      <GlowOrb color="rgba(99,102,241,0.2)" size={400} className="-right-32 top-1/3" />
      <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} mode="dark" />
      <div className="relative mx-auto grid min-h-[calc(100vh-72px)] max-w-6xl grid-cols-1 items-center gap-12 px-8 pb-16 lg:grid-cols-2">
        <motion.div {...pageEnter} className={cn("max-w-md", DARK_FORM_SKIN)}>
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow} dark>
            {children}
          </Form>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="pointer-events-none hidden lg:block"
        >
          <p className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-[100px] font-bold leading-none tracking-tighter text-transparent">
            Partner
          </p>
          <p className="mt-4 max-w-sm text-zinc-500">Zamonaviy salon boshqaruvi — tez, aniq, professional.</p>
        </motion.div>
      </div>
    </div>
  );
}

function LinearCrimsonLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT["linear-crimson"];
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c0a0a]">
      <VariantVisual variant="linear-crimson" />
      <GlowOrb color="rgba(244,63,94,0.35)" size={450} className="left-1/2 top-0 -translate-x-1/2" />
      <GlowOrb color="rgba(251,113,133,0.2)" size={300} className="bottom-10 right-10" delay={2} />
      <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} mode="dark" />
      <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center px-8 pb-16">
        <motion.div
          {...pageEnter}
          className={cn("w-full max-w-md rounded-2xl border border-rose-500/20 bg-zinc-950/80 p-8 backdrop-blur-sm", DARK_FORM_SKIN)}
        >
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow} dark>
            {children}
          </Form>
        </motion.div>
      </div>
    </div>
  );
}

/* ═══ FIGMA family ═══ */

function FigmaMeshLayout({
  variant,
  bg,
  flow,
  tab,
  signupStep,
  onTabChange,
  children,
}: ShellProps & { variant: AuthDesktopVariant; bg: string }) {
  const accent = VARIANT_ACCENT[variant];
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: bg }}>
      <VariantVisual variant={variant} />
      <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} mode="dark" className="relative z-10" />
      <div className="relative z-10 flex min-h-[calc(100vh-72px)] items-center justify-center px-6 pb-16">
        <motion.div
          {...pageEnter}
          className={cn(
            "w-full max-w-[460px] rounded-3xl border border-white/20 bg-white/85 p-8 shadow-2xl backdrop-blur-xl",
            LIGHT_FORM_SKIN,
          )}
        >
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </Form>
        </motion.div>
      </div>
    </div>
  );
}

/* ═══ FRAMER family ═══ */

function FramerSplitLayout({
  accentKey,
  headline,
  highlight,
  highlightClass,
  bgLeft,
  flow,
  tab,
  signupStep,
  onTabChange,
  children,
}: ShellProps & {
  accentKey: "framer-ember" | "framer-violet";
  headline: string;
  highlight: string;
  highlightClass: string;
  bgLeft: string;
}) {
  const accent = VARIANT_ACCENT[accentKey];
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className={cn("relative flex flex-col justify-center overflow-hidden px-10 py-12 lg:px-16", bgLeft)}>
        <motion.div
          className="pointer-events-none absolute -right-20 top-1/4 size-64 rounded-full opacity-40 blur-3xl"
          style={{ background: accentKey === "framer-ember" ? "#fb923c" : "#a78bfa" }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.div {...pageEnter} className="relative z-10">
          <p className={cn("text-sm font-bold uppercase tracking-widest", highlightClass)}>MySaloon</p>
          <h2 className="mt-4 text-5xl font-bold leading-[1.05] tracking-tight text-zinc-900 lg:text-6xl dark:text-white">
            {headline}
            <span className={highlightClass}> {highlight}</span>
          </h2>
        </motion.div>
      </div>
      <div className="flex flex-col justify-center bg-white px-10 py-12 lg:px-16">
        <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} className="mb-6 !px-0 !py-0" />
        <motion.div {...pageEnter} className={cn("max-w-[400px]", LIGHT_FORM_SKIN)}>
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow} titleSize="compact">
            {children}
          </Form>
        </motion.div>
      </div>
    </div>
  );
}

/* ═══ SUPABASE family ═══ */

function SupabaseDarkLayout({
  variant,
  bg,
  asideTheme,
  flow,
  tab,
  signupStep,
  onTabChange,
  children,
}: ShellProps & { variant: AuthDesktopVariant; bg: string; asideTheme: "emerald" | "dark" }) {
  const accent = VARIANT_ACCENT[variant];
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: bg }}>
      <VariantVisual variant={variant} />
      <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} mode="dark" />
      <div className="relative mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 px-8 py-12 lg:grid-cols-2">
        <motion.div {...pageEnter} className={cn("max-w-md", DARK_FORM_SKIN)}>
          <AuthDesktopLogo accent={accent} dark className="mb-8" />
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow} dark>
            {children}
          </Form>
        </motion.div>
        <div className="hidden lg:block">
          <AuthDesktopOnboardingAside
            flow={flow}
            tab={tab}
            signupStep={signupStep}
            theme={asideTheme}
            accent={accent}
            presentation={tab === "signup" ? "steps" : "stats"}
          />
        </div>
      </div>
    </div>
  );
}

const LAYOUTS: Record<AuthDesktopVariant, (p: ShellProps) => ReactNode> = {
  "linear-indigo": LinearIndigoLayout,
  "linear-crimson": LinearCrimsonLayout,
  "figma-sunset": (p) => (
    <FigmaMeshLayout
      {...p}
      variant="figma-sunset"
      bg="radial-gradient(circle at 20% 30%, #fff7ed 0%, transparent 50%), radial-gradient(circle at 80% 20%, #ffe4e6 0%, transparent 45%), #fafafa"
    />
  ),
  "figma-ocean": (p) => (
    <FigmaMeshLayout
      {...p}
      variant="figma-ocean"
      bg="radial-gradient(circle at 10% 80%, #cffafe 0%, transparent 40%), radial-gradient(circle at 90% 10%, #dbeafe 0%, transparent 45%), #f0f9ff"
    />
  ),
  "figma-nova": (p) => (
    <FigmaMeshLayout
      {...p}
      variant="figma-nova"
      bg="radial-gradient(circle at 30% 40%, #fae8ff 0%, transparent 45%), radial-gradient(circle at 70% 60%, #dcfce7 0%, transparent 40%), #0f0f12"
    />
  ),
  "framer-ember": (p) => (
    <FramerSplitLayout
      {...p}
      accentKey="framer-ember"
      headline="Saloningizni boshqaring."
      highlight="Tezroq."
      highlightClass="text-orange-500"
      bgLeft="bg-[#fff7ed]"
    />
  ),
  "framer-violet": (p) => (
    <FramerSplitLayout
      {...p}
      accentKey="framer-violet"
      headline="Partner kabineti."
      highlight="Kuchliroq."
      highlightClass="text-violet-500"
      bgLeft="bg-[#f5f3ff]"
    />
  ),
  "supabase-grove": (p) => <SupabaseDarkLayout {...p} variant="supabase-grove" bg="#141414" asideTheme="emerald" />,
  "supabase-abyss": (p) => <SupabaseDarkLayout {...p} variant="supabase-abyss" bg="#0a1014" asideTheme="dark" />,
  "supabase-pulse": (p) => <SupabaseDarkLayout {...p} variant="supabase-pulse" bg="#101018" asideTheme="dark" />,
};

export function AuthDesktopLayout({ variant, ...props }: AuthDesktopLayoutProps) {
  const Layout = LAYOUTS[variant];
  return <Layout {...props} />;
}
