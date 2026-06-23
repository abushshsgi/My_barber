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
import type { AuthImageLayoutVariant } from "@/lib/auth-image-layout-variant";
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

type VisualProps = {
  content: ResolvedContent;
  className?: string;
  iconClass?: string;
  showBadge?: boolean;
};

function FlowVisual({ content, className, iconClass = "size-10", showBadge = true }: VisualProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br shadow-inner ring-1 ring-inset",
        content.visual.gradient,
        content.visual.ring,
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.75),transparent_50%)]" />
      <div className="absolute -right-8 -top-8 size-36 rounded-full bg-white/35 blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/10 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-5">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-white/85 shadow-md backdrop-blur-sm">
          <FlowIcon name={content.visual.icon} className={cn(iconClass, "text-foreground")} />
        </div>
        {showBadge ? (
          <span className="mt-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600 shadow-sm">
            {content.badge}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CopyBlock({ content }: { content: ResolvedContent }) {
  return (
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

function StatBlock({ content }: { content: ResolvedContent }) {
  return (
    <div className="inline-flex items-baseline gap-2.5 rounded-2xl border border-black/5 bg-white/70 px-5 py-3.5 shadow-sm">
      <span className={cn("text-3xl font-bold tabular-nums", c.highlightClass)}>{content.stat.value}</span>
      <span className="text-sm text-zinc-500">{content.stat.label}</span>
    </div>
  );
}

function TextFooter({ content }: { content: ResolvedContent }) {
  return (
    <>
      <div className="mt-8">
        <BulletList content={content} />
      </div>
      <div className="mt-10">
        <StatBlock content={content} />
      </div>
    </>
  );
}

function ImageLayoutBody({ content, layout }: { content: ResolvedContent; layout: AuthImageLayoutVariant }) {
  switch (layout) {
    /* 01 — chapda tor rasm */
    case "left-strip":
      return (
        <>
          <div className="mt-8 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-[minmax(0,11.5rem)_1fr] lg:gap-6">
            <FlowVisual content={content} className="min-h-[220px]" />
            <CopyBlock content={content} />
          </div>
          <TextFooter content={content} />
        </>
      );

    /* 02 — o'ngda tor rasm */
    case "right-strip":
      return (
        <>
          <div className="mt-8 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-[1fr_minmax(0,11.5rem)] lg:gap-6">
            <CopyBlock content={content} />
            <FlowVisual content={content} className="min-h-[220px] sm:order-2" />
          </div>
          <TextFooter content={content} />
        </>
      );

    /* 03 — yuqori keng banner */
    case "top-hero":
      return (
        <>
          <FlowVisual content={content} className="mt-8 h-44 w-full lg:h-52" />
          <div className="mt-6">
            <CopyBlock content={content} />
          </div>
          <TextFooter content={content} />
        </>
      );

    /* 04 — matn yuqori, rasm pastda */
    case "bottom-card":
      return (
        <>
          <div className="mt-8">
            <CopyBlock content={content} />
          </div>
          <TextFooter content={content} />
          <FlowVisual content={content} className="mt-8 h-40 w-full" />
        </>
      );

    /* 05 — fon watermark */
    case "bg-watermark":
      return (
        <div className="relative mt-8">
          <FlowVisual
            content={content}
            className="pointer-events-none absolute inset-0 h-full min-h-[320px] opacity-[0.22] blur-[1px]"
            showBadge={false}
          />
          <div className="relative z-10 rounded-2xl bg-white/55 p-5 backdrop-blur-[2px]">
            <CopyBlock content={content} />
            <TextFooter content={content} />
          </div>
        </div>
      );

    /* 06 — suzuvchi o'ng yuqori */
    case "float-tr":
      return (
        <div className="relative mt-8">
          <FlowVisual
            content={content}
            className="absolute -right-2 top-0 z-10 h-36 w-36 shadow-lg sm:-right-4 sm:h-40 sm:w-40"
            iconClass="size-8"
          />
          <div className="pr-28 sm:pr-44">
            <CopyBlock content={content} />
          </div>
          <TextFooter content={content} />
        </div>
      );

    /* 07 — 50/50 teng split */
    case "split-equal":
      return (
        <>
          <div className="mt-8 grid min-h-[280px] grid-cols-1 gap-4 lg:grid-cols-2">
            <FlowVisual content={content} className="h-full min-h-[240px]" />
            <div className="flex flex-col justify-between">
              <CopyBlock content={content} />
              <div className="mt-6">
                <BulletList content={content} />
              </div>
            </div>
          </div>
          <div className="mt-8">
            <StatBlock content={content} />
          </div>
        </>
      );

    /* 08 — burchak accent (rasm kichik, chap yuqori) */
    case "corner-accent":
      return (
        <>
          <div className="relative mt-8 overflow-hidden rounded-2xl border border-black/5 bg-white/50 p-5 pt-28">
            <FlowVisual
              content={content}
              className="absolute -left-3 -top-3 h-32 w-32 rotate-[-4deg] shadow-md"
              iconClass="size-7"
            />
            <CopyBlock content={content} />
            <TextFooter content={content} />
          </div>
        </>
      );

    /* 09 — sarlavha va bullet orasida inset */
    case "mid-inset":
      return (
        <>
          <div className="mt-8">
            <CopyBlock content={content} />
          </div>
          <FlowVisual content={content} className="mx-auto mt-6 h-36 w-full max-w-md" />
          <TextFooter content={content} />
        </>
      );

    /* 10 — uzun hero, matn pastda */
    case "tall-hero":
      return (
        <>
          <FlowVisual content={content} className="mt-8 h-64 w-full lg:h-72" />
          <div className="mt-6 -translate-y-4 rounded-2xl border border-black/5 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
            <CopyBlock content={content} />
            <div className="mt-6">
              <BulletList content={content} />
            </div>
            <div className="mt-8">
              <StatBlock content={content} />
            </div>
          </div>
        </>
      );

    default:
      return <ImageLayoutBody content={content} layout="left-strip" />;
  }
}

type Props = {
  tab: "login" | "signup";
  flow: SignupFlow | null;
  imageLayout: AuthImageLayoutVariant;
};

export function AuthMarketingPanel({ tab, flow, imageLayout }: Props) {
  const content = resolveContent(tab, flow);
  const useFlowImageLayouts = tab === "signup" && flow !== null;

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
            key={`${content.key}-${imageLayout}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {useFlowImageLayouts ? (
              <ImageLayoutBody content={content} layout={imageLayout} />
            ) : (
              <ImageLayoutBody content={content} layout="left-strip" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
