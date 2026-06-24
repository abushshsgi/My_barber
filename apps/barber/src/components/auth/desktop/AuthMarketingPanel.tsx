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
    <div className="relative flex h-full min-h-0 flex-col justify-center overflow-hidden px-8 py-10 sm:px-10 lg:px-14 xl:px-16">
      <div className="relative z-10 max-w-xl">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-sm sm:size-10", a.logo)}>
            <Scissors className="size-3.5 sm:size-4" />
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
            <span className="mt-6 inline-flex rounded-full bg-black/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600 sm:mt-7 sm:text-[11px]">
              {content.badge}
            </span>

            <h1 className="mt-4 text-[1.65rem] font-bold leading-[1.1] tracking-tight text-zinc-900 sm:mt-5 sm:text-3xl lg:text-4xl xl:text-[3.1rem]">
              {content.headline}
              <br />
              <span className={c.highlightClass}>{content.highlight}</span>
            </h1>

            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-zinc-600 sm:mt-5 sm:text-[15px] lg:text-base">
              {content.subline}
            </p>

            <ul className="mt-6 space-y-2.5 sm:mt-8 sm:space-y-3">
              {content.bullets.map((b, i) => (
                <motion.li
                  key={b}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 + i * 0.06 }}
                  className="flex items-center gap-2.5 text-[13px] font-medium text-zinc-700 sm:gap-3 sm:text-sm"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-sm ring-1 ring-black/5 sm:size-7">
                    <FlowIcon name={content.bulletIcons[i] ?? "Check"} className="size-3 text-foreground sm:size-3.5" />
                  </span>
                  {b}
                </motion.li>
              ))}
            </ul>

            <div className="mt-7 ml-5 inline-flex items-baseline gap-2.5 rounded-2xl border border-black/5 bg-white/70 px-4 py-3 shadow-sm sm:mt-9 sm:ml-8 sm:gap-3 sm:px-5 sm:py-3.5 lg:ml-12">
              <span className={cn("text-[2rem] font-bold leading-none tabular-nums sm:text-[2.35rem] lg:text-[2.75rem]", c.highlightClass)}>
                {content.stat.value}
              </span>
              <span className="pb-0.5 text-sm text-zinc-500 sm:text-base">{content.stat.label}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
