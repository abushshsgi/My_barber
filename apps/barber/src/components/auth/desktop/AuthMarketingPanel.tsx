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
import {
  AUTH_FLOW_MARKETING,
  type AuthFlowMarketingContent,
  type AuthMarketingFeature,
} from "@/lib/barber-flow-config";
import type { AuthMarketingVariant } from "@/lib/auth-marketing-variant";
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
    "Ortiqcha bezak yo'q — faqat kerakli funksiyalar. Yangi xodim 10 daqiqada tizimga kiradi va bron qabul qila boshlaydi. Sodda interfeys, o'zbek tilida va doimiy yordam.",
  bullets: c.bullets as ResolvedContent["bullets"],
  features: [
    { icon: "Scissors", title: "Sodda interfeys", desc: "Tez o'rganish va ishlatish" },
    { icon: "Users", title: "O'zbek tilida", desc: "To'liq mahalliy til qo'llab-quvvatlash" },
    { icon: "MessageSquare", title: "Yordam 24/7", desc: "Har qanday savolga javob" },
  ],
  stat: c.stat,
  visual: { gradient: "from-zinc-200 via-zinc-100 to-[#f4f4f5]", icon: "Scissors", ring: "ring-zinc-300/60" },
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

function HeroVisual({ content, size = "md" }: { content: ResolvedContent; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-52" : "h-40";
  const iconBox = size === "lg" ? "size-20" : "size-16";
  const iconSize = size === "lg" ? "size-10" : "size-8";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br shadow-inner",
        box,
        content.visual.gradient,
        content.visual.ring,
        "ring-1 ring-inset",
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.7),transparent_55%)]" />
      <div className="absolute -right-6 -top-6 size-32 rounded-full bg-white/30 blur-2xl" />
      <div className="absolute bottom-4 left-4 flex items-end gap-3">
        <div className={cn("flex items-center justify-center rounded-2xl bg-white/80 shadow-sm backdrop-blur-sm", iconBox)}>
          <FlowIcon name={content.visual.icon} className={cn(iconSize, "text-foreground")} />
        </div>
        <span className="mb-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600 shadow-sm">
          {content.badge}
        </span>
      </div>
    </div>
  );
}

function StatPill({ content, className }: { content: ResolvedContent; className?: string }) {
  return (
    <div className={cn("inline-flex items-baseline gap-2.5 rounded-2xl border border-black/5 bg-white/70 px-5 py-3.5 shadow-sm", className)}>
      <span className={cn("text-3xl font-bold tabular-nums", c.highlightClass)}>{content.stat.value}</span>
      <span className="text-sm text-zinc-500">{content.stat.label}</span>
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
            <FlowIcon name={content.features[i]?.icon ?? "Check"} className="size-3.5 text-foreground" />
          </span>
          {b}
        </motion.li>
      ))}
    </ul>
  );
}

function FeatureCards({ features }: { features: readonly AuthMarketingFeature[] }) {
  return (
    <div className="space-y-2.5">
      {features.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 + i * 0.07 }}
          className="flex gap-3 rounded-xl border border-black/5 bg-white/70 p-3.5 shadow-sm"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
            <FlowIcon name={f.icon} className="size-5 text-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{f.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">{f.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function VariantIconShort({ content }: { content: ResolvedContent }) {
  return (
    <div className="flex flex-col items-start">
      <div className="flex size-24 items-center justify-center rounded-3xl bg-white shadow-md ring-1 ring-black/5">
        <FlowIcon name={content.visual.icon} className="size-12 text-foreground" />
      </div>
      <span className="mt-6 rounded-full bg-black/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
        {content.badge}
      </span>
      <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-zinc-900 lg:text-4xl">{content.shortTitle}</h1>
      <p className="mt-3 max-w-sm text-sm text-zinc-600">{content.subline}</p>
      <StatPill content={content} className="mt-8" />
    </div>
  );
}

function VariantIconBullets({ content }: { content: ResolvedContent }) {
  return (
    <>
      <span className="mt-8 inline-flex rounded-full bg-black/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
        {content.badge}
      </span>
      <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-zinc-900 lg:text-[3.25rem]">
        {content.headline}
        <br />
        <span className={c.highlightClass}>{content.highlight}</span>
      </h1>
      <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-600 lg:text-[17px]">{content.subline}</p>
      <div className="mt-9">
        <BulletList content={content} />
      </div>
      <StatPill content={content} className="mt-11" />
    </>
  );
}

function VariantImageLong({ content }: { content: ResolvedContent }) {
  return (
    <>
      <div className="mt-8">
        <HeroVisual content={content} size="lg" />
      </div>
      <h1 className="mt-6 text-2xl font-bold leading-snug tracking-tight text-zinc-900 lg:text-3xl">{content.shortTitle}</h1>
      <p className="mt-4 text-base leading-[1.75] text-zinc-600 lg:text-[17px]">{content.longText}</p>
      <StatPill content={content} className="mt-8" />
    </>
  );
}

function VariantCardsGrid({ content }: { content: ResolvedContent }) {
  return (
    <>
      <span className="mt-8 inline-flex rounded-full bg-black/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
        {content.badge}
      </span>
      <h1 className="mt-4 text-3xl font-bold leading-tight text-zinc-900">{content.shortTitle}</h1>
      <p className="mt-2 text-sm text-zinc-600">{content.subline}</p>
      <div className="mt-6">
        <FeatureCards features={content.features} />
      </div>
      <StatPill content={content} className="mt-6" />
    </>
  );
}

function VariantFullMix({ content }: { content: ResolvedContent }) {
  return (
    <>
      <div className="mt-6">
        <HeroVisual content={content} size="md" />
      </div>
      <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-zinc-900 lg:text-[2.5rem]">
        {content.headline}{" "}
        <span className={c.highlightClass}>{content.highlight}</span>
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">{content.subline}</p>
      <div className="mt-5">
        <BulletList content={content} />
      </div>
      <blockquote className="mt-5 border-l-2 border-zinc-300 pl-4 text-sm italic leading-relaxed text-zinc-600">
        {content.longText}
      </blockquote>
      <StatPill content={content} className="mt-6" />
    </>
  );
}

function MarketingBody({ variant, content }: { variant: AuthMarketingVariant; content: ResolvedContent }) {
  switch (variant) {
    case "icon-short":
      return <VariantIconShort content={content} />;
    case "image-long":
      return <VariantImageLong content={content} />;
    case "cards-grid":
      return <VariantCardsGrid content={content} />;
    case "full-mix":
      return <VariantFullMix content={content} />;
    case "icon-bullets":
    default:
      return <VariantIconBullets content={content} />;
  }
}

type Props = {
  tab: "login" | "signup";
  flow: SignupFlow | null;
  variant: AuthMarketingVariant;
};

export function AuthMarketingPanel({ tab, flow, variant }: Props) {
  const content = resolveContent(tab, flow);
  const showFlowLayout = tab === "signup" && flow !== null;

  return (
    <div className={cn("relative flex flex-col justify-center overflow-hidden px-10 py-14 lg:px-16 lg:py-16", c.bgLeft)}>
      <motion.div
        className="pointer-events-none absolute -right-16 top-1/4 size-80 rounded-full opacity-40 blur-3xl"
        style={{ background: c.glowColor }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 max-w-xl">
        <BrandRow />

        <AnimatePresence mode="wait">
          <motion.div
            key={`${content.key}-${variant}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {showFlowLayout ? (
              <MarketingBody variant={variant} content={content} />
            ) : (
              <VariantIconBullets content={content} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
