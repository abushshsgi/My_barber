import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { AuthDesktopBackground } from "@/components/auth/desktop/AuthDesktopBackground";
import { AuthDesktopFormChrome } from "@/components/auth/desktop/AuthDesktopFormChrome";
import { AuthDesktopOnboardingAside } from "@/components/auth/desktop/AuthDesktopOnboardingAside";
import { AuthUzumHeader } from "@/components/auth/uzum/AuthUzumHeader";
import type { SignupFlow } from "@/lib/auth-ui";
import type { AuthAccent, AuthDesktopVariant } from "@/lib/auth-desktop-variant";
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

const VARIANT_ACCENT: Record<AuthDesktopVariant, AuthAccent> = {
  center: "violet",
  orbit: "indigo",
  "split-violet": "violet",
  "split-slate": "slate",
  glass: "purple",
  minimal: "slate",
  sand: "plum",
  mist: "blue",
  plum: "plum",
  indigo: "indigo",
  narrow: "violet",
  wide: "purple",
  ribbon: "fuchsia",
  frame: "indigo",
  glow: "violet",
};

function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      {...pageEnter}
      className={cn(
        "w-full rounded-2xl bg-white px-8 py-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

function FormWrap({
  accent,
  tab,
  signupStep,
  flow,
  children,
}: {
  accent: AuthAccent;
  tab: "login" | "signup";
  signupStep: number;
  flow: SignupFlow | null;
  children: ReactNode;
}) {
  return (
    <AuthDesktopFormChrome tab={tab} signupStep={signupStep} flow={flow} accent={accent}>
      {children}
    </AuthDesktopFormChrome>
  );
}

function PageRoot({
  variant,
  onTabChange,
  tab,
  accent,
  children,
  className,
}: {
  variant: AuthDesktopVariant;
  onTabChange: (t: "login" | "signup") => void;
  tab: "login" | "signup";
  accent: AuthAccent;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-screen", className)}>
      <AuthDesktopBackground variant={variant} />
      <AuthUzumHeader tab={tab} onTabChange={onTabChange} accent={accent} />
      {children}
    </div>
  );
}

/* ─── 01 Center — asosiy marketplace kartochka ─── */
function CenterLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.center;
  return (
    <PageRoot variant="center" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-6 pb-12">
        <Card className="max-w-[480px]">
          <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </FormWrap>
        </Card>
      </div>
    </PageRoot>
  );
}

/* ─── 02 Orbit — nuqtali fon, indigo aksent ─── */
function OrbitLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.orbit;
  return (
    <PageRoot variant="orbit" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-6 pb-12">
        <Card className="max-w-[480px] border border-indigo-100/80">
          <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </FormWrap>
        </Card>
      </div>
    </PageRoot>
  );
}

/* ─── 03 Split violet — forma chapda, onboarding o'ngda ─── */
function SplitVioletLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT["split-violet"];
  return (
    <PageRoot variant="split-violet" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative mx-auto flex min-h-[calc(100vh-76px)] max-w-[1040px] items-stretch gap-0 px-6 py-10">
        <Card className="flex max-w-[480px] flex-1 flex-col justify-center self-center">
          <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </FormWrap>
        </Card>
        <aside className="hidden flex-1 flex-col justify-center pl-10 lg:flex">
          <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-violet-800 p-10 text-white shadow-xl">
            <AuthDesktopOnboardingAside
              flow={flow}
              tab={tab}
              signupStep={signupStep}
              theme="violet"
              accent={accent}
            />
          </div>
        </aside>
      </div>
    </PageRoot>
  );
}

/* ─── 04 Split slate — onboarding chapda ─── */
function SplitSlateLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT["split-slate"];
  return (
    <PageRoot variant="split-slate" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative mx-auto grid min-h-[calc(100vh-76px)] max-w-[1040px] grid-cols-1 items-center gap-8 px-6 py-10 lg:grid-cols-[1fr_480px]">
        <aside className="hidden rounded-3xl border border-slate-200 bg-white/70 p-10 backdrop-blur-sm lg:block">
          <AuthDesktopOnboardingAside
            flow={flow}
            tab={tab}
            signupStep={signupStep}
            theme="slate"
            accent="violet"
          />
        </aside>
        <Card className="max-w-[480px] justify-self-end">
          <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </FormWrap>
        </Card>
      </div>
    </PageRoot>
  );
}

/* ─── 05 Glass — shaffof kartochka ─── */
function GlassLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.glass;
  return (
    <PageRoot variant="glass" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-6 pb-12">
        <motion.div
          {...pageEnter}
          className="w-full max-w-[500px] rounded-[28px] border border-white/70 bg-white/65 p-8 shadow-2xl backdrop-blur-2xl"
        >
          <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </FormWrap>
        </motion.div>
      </div>
    </PageRoot>
  );
}

/* ─── 06 Minimal — tekis fon, ingichka chegara ─── */
function MinimalLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.minimal;
  return (
    <PageRoot variant="minimal" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-6 pb-12">
        <Card className="max-w-[460px] border border-zinc-200 shadow-none">
          <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </FormWrap>
        </Card>
      </div>
    </PageRoot>
  );
}

/* ─── 07 Sand — issiq qum rang ─── */
function SandLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.sand;
  return (
    <PageRoot variant="sand" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-6 pb-12">
        <Card className="max-w-[480px] border border-stone-200/80">
          <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </FormWrap>
        </Card>
      </div>
    </PageRoot>
  );
}

/* ─── 08 Mist — ko'k tuman grid ─── */
function MistLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.mist;
  return (
    <PageRoot variant="mist" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-6 pb-12">
        <Card className="max-w-[480px] border border-blue-100">
          <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </FormWrap>
        </Card>
      </div>
    </PageRoot>
  );
}

/* ─── 09 Plum — binafsha gradient fon ─── */
function PlumLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.plum;
  return (
    <PageRoot variant="plum" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-6 pb-12">
        <Card className="max-w-[480px] ring-1 ring-purple-200/60">
          <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </FormWrap>
        </Card>
      </div>
    </PageRoot>
  );
}

/* ─── 10 Indigo — chiziqli grid ─── */
function IndigoLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.indigo;
  return (
    <PageRoot variant="indigo" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-6 pb-12">
        <Card className="max-w-[480px] border-t-4 border-t-indigo-500">
          <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </FormWrap>
        </Card>
      </div>
    </PageRoot>
  );
}

/* ─── 11 Narrow — tor kompakt ─── */
function NarrowLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.narrow;
  return (
    <PageRoot variant="narrow" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-6 pb-12">
        <Card className="max-w-[400px] px-6 py-7">
          <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </FormWrap>
        </Card>
      </div>
    </PageRoot>
  );
}

/* ─── 12 Wide — keng panel ─── */
function WideLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.wide;
  return (
    <PageRoot variant="wide" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-6 pb-12">
        <Card className="max-w-[560px]">
          <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </FormWrap>
        </Card>
      </div>
    </PageRoot>
  );
}

/* ─── 13 Ribbon — yuqori lenta aksent ─── */
function RibbonLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.ribbon;
  return (
    <PageRoot variant="ribbon" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-6 pb-12">
        <motion.div {...pageEnter} className="relative w-full max-w-[480px]">
          <div className="absolute -top-1 left-8 right-8 h-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600" />
          <Card className="pt-10">
            <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
              {children}
            </FormWrap>
          </Card>
        </motion.div>
      </div>
    </PageRoot>
  );
}

/* ─── 14 Frame — ikki qavatli ramka ─── */
function FrameLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.frame;
  return (
    <PageRoot variant="frame" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-6 pb-12">
        <div className="rounded-[24px] border-2 border-indigo-200/60 p-2">
          <Card className="max-w-[480px] border border-indigo-100 shadow-none">
            <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
              {children}
            </FormWrap>
          </Card>
        </div>
      </div>
    </PageRoot>
  );
}

/* ─── 15 Glow — markaziy yorug'lik ─── */
function GlowLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.glow;
  return (
    <PageRoot variant="glow" tab={tab} onTabChange={onTabChange} accent={accent}>
      <div className="relative flex min-h-[calc(100vh-76px)] items-center justify-center px-6 pb-12">
        <Card className="max-w-[480px] shadow-[0_0_80px_-10px_rgba(124,58,237,0.35)]">
          <FormWrap accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </FormWrap>
        </Card>
      </div>
    </PageRoot>
  );
}

const LAYOUTS: Record<AuthDesktopVariant, (p: ShellProps) => ReactNode> = {
  center: CenterLayout,
  orbit: OrbitLayout,
  "split-violet": SplitVioletLayout,
  "split-slate": SplitSlateLayout,
  glass: GlassLayout,
  minimal: MinimalLayout,
  sand: SandLayout,
  mist: MistLayout,
  plum: PlumLayout,
  indigo: IndigoLayout,
  narrow: NarrowLayout,
  wide: WideLayout,
  ribbon: RibbonLayout,
  frame: FrameLayout,
  glow: GlowLayout,
};

export function AuthDesktopLayout({ variant, ...props }: AuthDesktopLayoutProps) {
  const Layout = LAYOUTS[variant];
  return <Layout {...props} />;
}
