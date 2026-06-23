import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { AuthDesktopFormChrome } from "@/components/auth/desktop/AuthDesktopFormChrome";
import { AuthDesktopHeader, AuthDesktopLogo } from "@/components/auth/desktop/AuthDesktopHeader";
import { AuthDesktopOnboardingAside } from "@/components/auth/desktop/AuthDesktopOnboardingAside";
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
  showLegal = true,
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
  showLegal?: boolean;
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
        showLegal={showLegal}
      >
        {children}
      </AuthDesktopFormChrome>
    </div>
  );
}

/* ─── 01 Linear — qorong'u minimal ─── */
function LinearLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.linear;
  return (
    <div className="relative min-h-screen bg-[#09090b]">
      <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} mode="dark" />
      <div className="relative mx-auto grid min-h-[calc(100vh-72px)] max-w-6xl grid-cols-1 items-center gap-12 px-8 pb-16 lg:grid-cols-2">
        <motion.div {...pageEnter} className={cn("max-w-md", DARK_FORM_SKIN)}>
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow} dark showLegal>
            {children}
          </Form>
        </motion.div>
        <div className="pointer-events-none hidden lg:block">
          <p className="text-[120px] font-bold leading-none tracking-tighter text-zinc-800/80">Partner</p>
          <p className="mt-4 max-w-sm text-zinc-500">
            Issue tracking dan ko'ra oson — salon boshqaruvi uchun zamonaviy vosita.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── 02 Stripe — 50/50 split gradient ─── */
function StripeLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.stripe;
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-8 py-12 lg:px-14">
        <AuthDesktopLogo accent={accent} className="mb-10" />
        <motion.div {...pageEnter} className={cn("max-w-[420px]", LIGHT_FORM_SKIN)}>
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </Form>
        </motion.div>
        <button
          type="button"
          onClick={() => onTabChange(tab === "login" ? "signup" : "login")}
          className="mt-6 text-left text-sm text-muted-foreground hover:text-foreground"
        >
          {tab === "login" ? "Hisobingiz yo'qmi? Ro'yxatdan o'ting" : "Allaqachon hisobingiz bormi? Kirish"}
        </button>
      </div>
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex"
        style={{
          background: "linear-gradient(135deg, #635bff 0%, #7a73ff 35%, #00d4ff 100%)",
        }}
      >
        <div />
        <AuthDesktopOnboardingAside
          flow={flow}
          tab={tab}
          signupStep={signupStep}
          theme="gradient"
          accent={accent}
          presentation="quote"
        />
      </div>
    </div>
  );
}

/* ─── 03 Notion — issiq, yumshoq ─── */
function NotionLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.notion;
  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} />
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 pb-16">
        <motion.div
          {...pageEnter}
          className={cn("w-full max-w-[420px] rounded-lg border border-stone-200/80 bg-white p-8 shadow-sm", LIGHT_FORM_SKIN)}
        >
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow} titleSize="compact">
            {children}
          </Form>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── 04 Vercel — qora geometrik ─── */
function VercelLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.vercel;
  return (
    <div className="relative min-h-screen bg-black">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} mode="dark" />
      <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center px-6 pb-16">
        <motion.div
          {...pageEnter}
          className={cn("w-full max-w-[440px] rounded-xl border border-zinc-800 bg-zinc-950 p-8", DARK_FORM_SKIN)}
        >
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow} dark>
            {children}
          </Form>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── 05 Intercom — ko'k panel chapda ─── */
function IntercomLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.intercom;
  return (
    <div className="grid min-h-screen lg:grid-cols-[42%_1fr]">
      <div className="flex flex-col justify-between bg-[#286efa] p-10 lg:p-14">
        <AuthDesktopLogo accent={accent} dark />
        <AuthDesktopOnboardingAside
          flow={flow}
          tab={tab}
          signupStep={signupStep}
          theme="intercom"
          accent={accent}
          presentation={tab === "signup" ? "steps" : "stats"}
        />
      </div>
      <div className="flex flex-col justify-center bg-white px-8 py-12 lg:px-16">
        <motion.div {...pageEnter} className={cn("mx-auto w-full max-w-[420px]", LIGHT_FORM_SKIN)}>
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </Form>
        </motion.div>
        <button
          type="button"
          onClick={() => onTabChange(tab === "login" ? "signup" : "login")}
          className="mx-auto mt-6 block text-sm text-[#286efa] hover:underline"
        >
          {tab === "login" ? "Ro'yxatdan o'tish" : "Kirish"}
        </button>
      </div>
    </div>
  );
}

/* ─── 06 Slack — binafsha sidebar ─── */
function SlackLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.slack;
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[280px] shrink-0 flex-col bg-[#4a154b] p-8 lg:flex">
        <AuthDesktopLogo accent={accent} dark className="mb-12" />
        <AuthDesktopOnboardingAside
          flow={flow}
          tab={tab}
          signupStep={signupStep}
          theme="slack"
          accent={accent}
          presentation="steps"
        />
      </aside>
      <div className="flex flex-1 flex-col bg-[#f8f8f8]">
        <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} className="lg:hidden" />
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <motion.div {...pageEnter} className={cn("w-full max-w-[440px] rounded-lg bg-white p-8 shadow-sm", LIGHT_FORM_SKIN)}>
            <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow} showProgress={tab === "signup"}>
              {children}
            </Form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ─── 07 Figma — rangli mesh ─── */
function FigmaLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.figma;
  return (
    <div
      className="relative min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 10% 20%, #ff7262 0%, transparent 40%), radial-gradient(circle at 90% 10%, #a259ff 0%, transparent 35%), radial-gradient(circle at 50% 90%, #0acf83 0%, transparent 40%), #f0f0f0",
      }}
    >
      <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} mode="dark" className="!text-white" />
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 pb-16">
        <motion.div
          {...pageEnter}
          className={cn("w-full max-w-[460px] rounded-3xl bg-white/90 p-8 shadow-2xl backdrop-blur-xl", LIGHT_FORM_SKIN)}
        >
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </Form>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── 08 Raycast — glass qorong'u ─── */
function RaycastLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.raycast;
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#1a1a1c]">
      <div className="absolute -left-32 top-20 size-96 rounded-full bg-violet-600/30 blur-[100px]" />
      <div className="absolute -right-20 bottom-10 size-80 rounded-full bg-blue-500/20 blur-[80px]" />
      <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} mode="dark" />
      <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center px-6 pb-16">
        <motion.div
          {...pageEnter}
          className={cn(
            "w-full max-w-[440px] rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-2xl",
            DARK_FORM_SKIN,
          )}
        >
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow} dark>
            {children}
          </Form>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── 09 Attio — grid + mock kartalar ─── */
function AttioLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.attio;
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="flex flex-col justify-center px-10 py-12 lg:px-16">
        <AuthDesktopLogo accent={accent} className="mb-8" />
        <motion.div {...pageEnter} className={cn("max-w-[420px]", LIGHT_FORM_SKIN)}>
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </Form>
        </motion.div>
      </div>
      <div
        className="relative hidden items-center justify-center overflow-hidden bg-zinc-50 lg:flex"
        style={{
          backgroundImage: "radial-gradient(#d4d4d8 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="relative w-full max-w-sm space-y-3 p-8">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="h-2 w-24 rounded bg-blue-100" />
              <div className="mt-3 h-2 w-full rounded bg-zinc-100" />
              <div className="mt-2 h-2 w-3/4 rounded bg-zinc-100" />
            </motion.div>
          ))}
        </div>
        <div className="absolute bottom-10 left-10 right-10 hidden max-w-xs lg:block">
          <AuthDesktopOnboardingAside
            flow={flow}
            tab={tab}
            signupStep={signupStep}
            theme="light"
            accent={accent}
            presentation="stats"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── 10 Supabase — emerald dark ─── */
function SupabaseLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.supabase;
  return (
    <div className="relative min-h-screen bg-[#1c1c1c]">
      <div className="absolute right-0 top-0 h-full w-1/2 opacity-10">
        <svg viewBox="0 0 400 400" className="h-full w-full" fill="none">
          <path d="M0 200 Q100 100 200 200 T400 200" stroke="#34d399" strokeWidth="2" />
          <path d="M0 250 Q150 150 300 250" stroke="#34d399" strokeWidth="1" opacity="0.5" />
        </svg>
      </div>
      <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} mode="dark" />
      <div className="relative mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 px-8 py-12 lg:grid-cols-2">
        <motion.div {...pageEnter} className={cn("max-w-md", DARK_FORM_SKIN)}>
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow} dark>
            {children}
          </Form>
        </motion.div>
        <div className="hidden lg:block">
          <AuthDesktopOnboardingAside
            flow={flow}
            tab={tab}
            signupStep={signupStep}
            theme="emerald"
            accent={accent}
            presentation={tab === "signup" ? "steps" : "stats"}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── 11 Clerk — nuqtali fon, markaziy kartochka ─── */
function ClerkLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.clerk;
  return (
    <div
      className="min-h-screen bg-zinc-100"
      style={{
        backgroundImage: "radial-gradient(#a1a1aa 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} />
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 pb-16">
        <motion.div
          {...pageEnter}
          className={cn("w-full max-w-[420px] rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg", LIGHT_FORM_SKIN)}
        >
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </Form>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── 12 Framer — katta tipografiya split ─── */
function FramerLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.framer;
  return (
    <div className="grid min-h-screen bg-[#fafafa] lg:grid-cols-2">
      <div className="flex flex-col justify-center px-10 py-12 lg:px-16">
        <motion.div {...pageEnter}>
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">MySaloon</p>
          <h2 className="mt-4 text-5xl font-bold leading-[1.05] tracking-tight text-zinc-900 lg:text-6xl">
            Saloningizni boshqaring.
            <span className="text-orange-500"> Tezroq.</span>
          </h2>
        </motion.div>
      </div>
      <div className="flex flex-col justify-center border-t border-zinc-200 bg-white px-10 py-12 lg:border-l lg:border-t-0 lg:px-16">
        <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} className="mb-6 !px-0 !py-0" />
        <motion.div {...pageEnter} className={cn("max-w-[400px]", LIGHT_FORM_SKIN)}>
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow} titleSize="compact" showLegal>
            {children}
          </Form>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── 13 Loom — coral gradient overlap ─── */
function LoomLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.loom;
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div
        className="absolute inset-y-0 right-0 w-full lg:w-[55%]"
        style={{
          background: "linear-gradient(160deg, #ff6b4a 0%, #ff8f6b 40%, #ffb199 100%)",
        }}
      />
      <div className="relative grid min-h-screen lg:grid-cols-2">
        <div className="flex items-center px-8 py-12 lg:px-14">
          <motion.div
            {...pageEnter}
            className={cn("w-full max-w-[440px] rounded-2xl bg-white p-8 shadow-2xl lg:-mr-16", LIGHT_FORM_SKIN)}
          >
            <AuthDesktopLogo accent={accent} className="mb-6" />
            <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
              {children}
            </Form>
            <button
              type="button"
              onClick={() => onTabChange(tab === "login" ? "signup" : "login")}
              className="mt-4 text-sm text-[#ff6b4a] hover:underline"
            >
              {tab === "login" ? "Ro'yxatdan o'tish" : "Kirish"}
            </button>
          </motion.div>
        </div>
        <div className="hidden items-center p-14 lg:flex">
          <AuthDesktopOnboardingAside
            flow={flow}
            tab={tab}
            signupStep={signupStep}
            theme="coral"
            accent={accent}
            presentation={tab === "signup" ? "steps" : "quote"}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── 14 Miro — sariq playful ─── */
function MiroLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.miro;
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="border-b-4 border-[#ffd02f] bg-white">
        <AuthDesktopHeader tab={tab} onTabChange={onTabChange} accent={accent} />
      </div>
      <div className="flex min-h-[calc(100vh-76px)] items-center justify-center px-6 pb-16">
        <motion.div
          {...pageEnter}
          className={cn("w-full max-w-[480px] rounded-3xl border-2 border-[#ffd02f] bg-white p-8 shadow-[8px_8px_0_#050038]", LIGHT_FORM_SKIN)}
        >
          <Form accent={accent} tab={tab} signupStep={signupStep} flow={flow}>
            {children}
          </Form>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── 15 Cal — ultra minimal oq-qora ─── */
function CalLayout({ flow, tab, signupStep, onTabChange, children }: ShellProps) {
  const accent = VARIANT_ACCENT.cal;
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <AuthDesktopLogo accent={accent} className="mb-12" />
        <motion.div {...pageEnter}>
          <Form
            accent={accent}
            tab={tab}
            signupStep={signupStep}
            flow={flow}
            titleSize="compact"
            showProgress={false}
          >
            {children}
          </Form>
        </motion.div>
        <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-6 text-sm">
          <button
            type="button"
            onClick={() => onTabChange(tab === "login" ? "signup" : "login")}
            className="font-medium text-zinc-600 hover:text-zinc-900"
          >
            {tab === "login" ? "Ro'yxatdan o'tish" : "Kirish"}
          </button>
          <a href="mailto:support@mysaloon.uz" className="text-zinc-400 hover:text-zinc-600">
            Yordam
          </a>
        </div>
      </div>
    </div>
  );
}

const LAYOUTS: Record<AuthDesktopVariant, (p: ShellProps) => ReactNode> = {
  linear: LinearLayout,
  stripe: StripeLayout,
  notion: NotionLayout,
  vercel: VercelLayout,
  intercom: IntercomLayout,
  slack: SlackLayout,
  figma: FigmaLayout,
  raycast: RaycastLayout,
  attio: AttioLayout,
  supabase: SupabaseLayout,
  clerk: ClerkLayout,
  framer: FramerLayout,
  loom: LoomLayout,
  miro: MiroLayout,
  cal: CalLayout,
};

export function AuthDesktopLayout({ variant, ...props }: AuthDesktopLayoutProps) {
  const Layout = LAYOUTS[variant];
  return <Layout {...props} />;
}
