import type { AuthDesktopVariant } from "@/lib/auth-desktop-variant";
import { AuthUzumBackground } from "@/components/auth/uzum/AuthUzumBackground";

type Props = { variant: AuthDesktopVariant };

function OrbitDots() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#e8eaf0]" />
      {Array.from({ length: 48 }).map((_, i) => (
        <span
          key={i}
          className="absolute size-1.5 rounded-full bg-white/80"
          style={{
            left: `${(i * 17) % 100}%`,
            top: `${(i * 23 + 7) % 100}%`,
            opacity: 0.35 + (i % 5) * 0.1,
          }}
        />
      ))}
      <div className="absolute -right-32 top-1/4 size-96 rounded-full bg-indigo-200/30 blur-3xl" />
    </div>
  );
}

function SandWarm() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f3efe8]" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,#fff8f0_0%,transparent_55%)]" />
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[linear-gradient(to_top,#ebe4d8,transparent)]" />
    </div>
  );
}

function MistBlue() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#e6edf5]" aria-hidden>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(#c8d8ea 1px, transparent 1px), linear-gradient(90deg, #c8d8ea 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute left-1/4 top-1/3 size-[500px] rounded-full bg-blue-200/25 blur-3xl" />
    </div>
  );
}

function PlumGradient() {
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#ede8f5]"
      aria-hidden
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 60% at 70% 20%, #ddd6fe 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 10% 80%, #f5d0fe 0%, transparent 45%)",
      }}
    />
  );
}

function IndigoLines() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#eaecf4]" aria-hidden>
      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 1440 900" fill="none">
        <path d="M0 400 H1440" stroke="#a5b4fc" strokeWidth="1" strokeDasharray="8 12" />
        <path d="M0 550 H1440" stroke="#c7d2fe" strokeWidth="1" strokeDasharray="8 12" />
        <path d="M360 0 V900" stroke="#c7d2fe" strokeWidth="1" strokeDasharray="8 12" />
        <path d="M1080 0 V900" stroke="#a5b4fc" strokeWidth="1" strokeDasharray="8 12" />
      </svg>
    </div>
  );
}

function GlowVignette() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#dfe2e8]" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_50%_45%,#fff_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.06)_100%)]" />
    </div>
  );
}

function GlassMesh() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      aria-hidden
      style={{
        background:
          "linear-gradient(135deg, #e8e4f8 0%, #dce8f5 40%, #f0e8f8 100%)",
      }}
    >
      <div className="absolute -left-20 top-20 size-80 rounded-full bg-purple-300/30 blur-3xl" />
      <div className="absolute -right-10 bottom-10 size-96 rounded-full bg-blue-300/25 blur-3xl" />
    </div>
  );
}

function MinimalFlat() {
  return <div className="absolute inset-0 bg-[#f4f4f5]" aria-hidden />;
}

function SplitVioletBg() {
  return (
    <div className="absolute inset-0 bg-[#eceef2]" aria-hidden>
      <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-bl from-violet-100/80 to-violet-50/40" />
    </div>
  );
}

function SplitSlateBg() {
  return (
    <div className="absolute inset-0 bg-[#eceef2]" aria-hidden>
      <div className="absolute left-0 top-0 h-full w-[42%] bg-gradient-to-br from-slate-200/70 to-slate-100/30" />
    </div>
  );
}

export function AuthDesktopBackground({ variant }: Props) {
  switch (variant) {
    case "center":
      return <AuthUzumBackground />;
    case "orbit":
      return <OrbitDots />;
    case "split-violet":
      return <SplitVioletBg />;
    case "split-slate":
      return <SplitSlateBg />;
    case "glass":
      return <GlassMesh />;
    case "minimal":
      return <MinimalFlat />;
    case "sand":
      return <SandWarm />;
    case "mist":
      return <MistBlue />;
    case "plum":
      return <PlumGradient />;
    case "indigo":
      return <IndigoLines />;
    case "narrow":
    case "wide":
    case "ribbon":
    case "frame":
      return <AuthUzumBackground />;
    case "glow":
      return <GlowVignette />;
    default:
      return <AuthUzumBackground />;
  }
}
