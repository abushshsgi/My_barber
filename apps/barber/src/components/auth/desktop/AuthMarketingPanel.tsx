import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  CalendarDays,
  Clock,
  MapPin,
  MessageSquare,
  Scissors,
  Sparkles,
  Star,
  Store,
  UserPlus,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { SignupFlow } from "@/lib/auth-ui";
import { AUTH_FRAMER_CONFIG } from "@/lib/auth-framer-variants";
import { ACCENT_STYLES, AUTH_ACCENT } from "@/lib/auth-desktop-variant";
import { AUTH_FLOW_MARKETING, type AuthFlowMarketingContent } from "@/lib/barber-flow-config";
import { cn } from "@/lib/utils";

const c = AUTH_FRAMER_CONFIG;
const a = ACCENT_STYLES[AUTH_ACCENT];

const ICON_MAP: Record<string, LucideIcon> = {
  Store,
  UserPlus,
  Sparkles,
  Briefcase,
  Users,
  CalendarDays,
  Wallet,
  MapPin,
  MessageSquare,
  Zap,
  Clock,
  Star,
  Scissors,
};

type ResolvedContent = AuthFlowMarketingContent & { key: string };

const DEFAULT_CONTENT: ResolvedContent = {
  key: "default",
  badge: c.badge,
  headline: c.headline,
  highlight: c.highlight,
  shortTitle: "Murakkab emas. Ishlaydi.",
  subline: c.subline,
  longText:
    "Ortiqcha bezak yo'q — faqat kerakli funksiyalar. Yangi xodim 10 daqiqada tizimga kiradi va bron qabul qila boshlaydi.",
  bullets: c.bullets as ResolvedContent["bullets"],
  features: [
    { icon: "Scissors", title: "Sodda interfeys", desc: "Tez o'rganish va ishlatish" },
    { icon: "Users", title: "O'zbek tilida", desc: "To'liq mahalliy til qo'llab-quvvatlash" },
    { icon: "MessageSquare", title: "Yordam 24/7", desc: "Har qanday savolga javob" },
  ],
  stat: c.stat,
  visual: { gradient: "from-zinc-200 via-zinc-100 to-zinc-50", icon: "Scissors", ring: "ring-zinc-300/60" },
};

function resolveContent(tab: "login" | "signup", flow: SignupFlow | null): ResolvedContent {
  if (tab === "signup" && flow) {
    return { key: flow, ...AUTH_FLOW_MARKETING[flow] };
  }
  return DEFAULT_CONTENT;
}

function FlowIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Scissors;
  return <Icon className={className} />;
}

function BrandRow() {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn("flex size-10 items-center justify-center rounded-xl text-primary-foreground shadow-sm", a.logo)}>
        <Scissors className="size-4" />
      </div>
      <span className="text-sm font-bold text-foreground">MySaloon Partner</span>
    </div>
  );
}

function SideVisual({ content }: { content: ResolvedContent }) {
  return (
    <div
      className={cn(
        "relative h-full min-h-[220px] overflow-hidden rounded-2xl bg-gradient-to-br shadow-inner ring-1 ring-inset",
        content.visual.gradient,
        content.visual.ring,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.75),transparent_50%)]" />
      <div className="absolute -right-8 -top-8 size-36 rounded-full bg-white/35 blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/10 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-5">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-white/85 shadow-md backdrop-blur-sm">
          <FlowIcon name={content.visual.icon} className="size-10 text-foreground" />
        </div>
        <span className="mt-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600 shadow-sm">
          {content.badge}
        </span>
      </div>
    </div>
  );
}

function BulletList({ content }: { content: ResolvedContent }) {
  return (
    <ul className="space-y-3">
      {content.bullets.map((b, i) => (
        <motion.li
          key={b}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.06 + i * 0.06 }}
          className="flex items-center gap-3 text-sm font-medium text-zinc-700"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-sm ring-1 ring-black/5">
            <FlowIcon name={content.features[i]?.icon ?? "Scissors"} className="size-3.5 text-foreground" />
          </span>
          {b}
        </motion.li>
      ))}
    </ul>
  );
}

function MarketingBody({ content }: { content: ResolvedContent }) {
  return (
    <>
      <div className="mt-8 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-[minmax(0,11.5rem)_1fr] lg:gap-6">
        <SideVisual content={content} />

        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit rounded-full bg-black/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
            {content.badge}
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-[1.08] tracking-tight text-zinc-900 lg:text-[2.35rem]">
            {content.headline}
            <br />
            <span className={c.highlightClass}>{content.highlight}</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-600 lg:text-base">{content.subline}</p>
        </div>
      </div>

      <div className="mt-8">
        <BulletList content={content} />
      </div>

      <div className="mt-10 inline-flex items-baseline gap-2.5 rounded-2xl border border-black/5 bg-white/70 px-5 py-3.5 shadow-sm">
        <span className={cn("text-3xl font-bold tabular-nums", c.highlightClass)}>{content.stat.value}</span>
        <span className="text-sm text-zinc-500">{content.stat.label}</span>
      </div>
    </>
  );
}

type Props = {
  tab: "login" | "signup";
  flow: SignupFlow | null;
};

export function AuthMarketingPanel({ tab, flow }: Props) {
  const content = resolveContent(tab, flow);

  return (
    <div className={cn("relative flex flex-col justify-center overflow-hidden px-10 py-14 lg:px-16 lg:py-16", c.bgLeft)}>
      <motion.div
        className="pointer-events-none absolute -right-16 top-1/4 size-80 rounded-full opacity-40 blur-3xl"
        style={{ background: c.glowColor }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 max-w-2xl">
        <BrandRow />

        <AnimatePresence mode="wait">
          <motion.div
            key={content.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <MarketingBody content={content} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
