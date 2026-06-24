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
    <div className="relative flex h-full min-h-0 flex-col justify-start overflow-hidden px-5 pt-10 pb-6 sm:px-7 sm:pt-12 lg:px-9 lg:pt-16 xl:px-10 xl:pt-[4.5rem]">
      <div className="relative z-10 w-full max-w-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={content.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mx-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-left">
              <div className="flex items-center gap-2.5">
                <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-sm sm:size-10", a.logo)}>
                  <Scissors className="size-3.5 sm:size-4" />
                </div>
                <span className="text-[15px] font-bold text-foreground sm:text-base">MySaloon Partner</span>
              </div>
              <span className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-600 sm:text-xs">
                {content.badge}
              </span>
            </div>

            <motion.div className="mt-[100px] ml-10 flex w-[400px] max-w-full flex-wrap items-end text-left text-[30px]">
              <h1 className="w-full text-[50px] font-bold leading-[1.1] tracking-tight text-zinc-900">
                {content.headline}
                <br />
                <span className={c.highlightClass}>{content.highlight}</span>
              </h1>

              <p className="mt-3 w-full max-w-[400px] text-[18px] leading-relaxed text-zinc-600 sm:mt-4">
                {content.subline}
              </p>

              <ul className="mt-4 w-full space-y-2.5 sm:mt-5 sm:space-y-3">
                {content.bullets.map((b, i) => (
                  <motion.li
                    key={b}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 + i * 0.06 }}
                    className="flex items-center gap-2.5 text-[18px] font-medium text-zinc-700 sm:gap-3"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-sm ring-1 ring-black/5 sm:size-7">
                      <FlowIcon name={content.bulletIcons[i] ?? "Check"} className="size-3 text-foreground sm:size-3.5" />
                    </span>
                    {b}
                  </motion.li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-end gap-2.5 rounded-2xl border border-black/5 bg-white/70 px-4 py-3 text-left shadow-sm sm:mt-5 sm:gap-3 sm:px-5 sm:py-3.5">
                <span className={cn("text-[20px] font-bold leading-none tabular-nums", c.highlightClass)}>
                  {content.stat.value}
                </span>
                <span className="pb-0.5 text-[11px] text-zinc-500">{content.stat.label}</span>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
