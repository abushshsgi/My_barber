import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  CalendarDays,
  Check,
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
  Check,
};

type ResolvedContent = AuthFlowMarketingContent & { key: string };

const DEFAULT_CONTENT: ResolvedContent = {
  key: "default",
  badge: c.badge,
  headline: c.headline,
  highlight: c.highlight,
  subline: c.subline,
  bullets: c.bullets as ResolvedContent["bullets"],
  bulletIcons: ["Scissors", "Users", "MessageSquare"],
  stat: c.stat,
};

function resolveContent(tab: "login" | "signup", flow: SignupFlow | null): ResolvedContent {
  if (tab === "signup" && flow) {
    return { key: flow, ...AUTH_FLOW_MARKETING[flow] };
  }
  return DEFAULT_CONTENT;
}

function FlowIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Check;
  return <Icon className={className} />;
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

      <div className="relative z-10 max-w-xl">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex size-10 items-center justify-center rounded-xl text-primary-foreground shadow-sm", a.logo)}>
            <Scissors className="size-4" />
          </div>
          <span className="text-sm font-bold text-foreground">MySaloon Partner</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={content.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="mt-8 inline-flex rounded-full bg-black/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
              {content.badge}
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-zinc-900 lg:text-[3.25rem]">
              {content.headline}
              <br />
              <span className={c.highlightClass}>{content.highlight}</span>
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-600 lg:text-[17px]">{content.subline}</p>

            <ul className="mt-9 space-y-3">
              {content.bullets.map((b, i) => (
                <motion.li
                  key={b}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 + i * 0.06 }}
                  className="flex items-center gap-3 text-sm font-medium text-zinc-700"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-sm ring-1 ring-black/5">
                    <FlowIcon name={content.bulletIcons[i] ?? "Check"} className="size-3.5 text-foreground" />
                  </span>
                  {b}
                </motion.li>
              ))}
            </ul>

            <div className="mt-11 inline-flex items-baseline gap-2.5 rounded-2xl border border-black/5 bg-white/70 px-5 py-3.5 shadow-sm">
              <span className={cn("text-3xl font-bold tabular-nums", c.highlightClass)}>{content.stat.value}</span>
              <span className="text-sm text-zinc-500">{content.stat.label}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
