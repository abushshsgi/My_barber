import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Camera,
  ChevronRight,
  Images,
  Lock,
  LogOut,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { useNotificationsApi } from "@/hooks/use-notifications-api";
import { useSubscriptionMe } from "@/hooks/use-subscription";
import { fetchMorphAiGenerations } from "@/lib/api/ai";
import { hasValidUserSession } from "@/lib/api/client";

/** Morf AI profili — ilovadagi MorphProfileScreen tartibi. */
export function MorphMobileProfile() {
  const { t } = useTranslation();
  const { user, handleLogout } = useProfileScreen();
  const loggedIn = hasValidUserSession();
  const subQ = useSubscriptionMe();
  const { data: notifications = [] } = useNotificationsApi();
  const historyQ = useQuery({
    queryKey: ["ai", "generations"],
    queryFn: fetchMorphAiGenerations,
    enabled: loggedIn,
    staleTime: 30_000,
  });
  const unread = notifications.filter((n) => !n.read).length;
  const usage = subQ.data?.usage;
  const aiUsed = usage?.morph_ai_used ?? 0;
  const aiLimit = usage?.morph_ai_limit ?? 0;
  const aiRemain = usage?.morph_ai_remaining ?? 0;
  const pct = aiLimit > 0 ? Math.min(100, Math.round((aiUsed / aiLimit) * 100)) : 0;
  const plan =
    subQ.data?.current_plan?.name_uz ||
    subQ.data?.current_plan_code ||
    t("profile.subscription", { defaultValue: "Obuna" });
  const active = Boolean(subQ.data?.has_active);
  const history = historyQ.data ?? [];

  return (
    <div className="-mx-4 min-h-[70vh] bg-[var(--morph-bg,var(--background))] px-[clamp(0.75rem,3.2vw,1.25rem)] pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] pt-[max(1.25rem,env(safe-area-inset-top))] text-[var(--morph-fg,inherit)] sm:-mx-6 md:-mx-8">
      <div className="flex items-center gap-3">
        <UserAvatar name={user.name} src={user.avatar} size={56} editable={loggedIn} />
        <Link to="/settings" className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold tracking-tight">{user.name}</p>
          <p className="text-sm text-[var(--morph-muted,#737373)]">
            {t("profile.settings", { defaultValue: "Sozlamalar" })}
          </p>
        </Link>
        <Link to="/settings" aria-label={t("profile.settings")} className="text-[var(--morph-muted,#737373)]">
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <Link
        to="/subscriptions"
        className="mt-5 block rounded-3xl border border-black/12 bg-[var(--morph-card,#fff)] p-[clamp(0.85rem,3vw,1.15rem)]"
      >
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--morph-muted,#737373)]">
              {t("profile.subscription", { defaultValue: "Obuna" })}
            </p>
            <p className="mt-1 text-base font-semibold">
              {aiLimit > 0
                ? t("profile.generationsRemaining", {
                    count: aiRemain,
                    defaultValue: "{{count}} ta generatsiya qoldi",
                  })
                : plan}
            </p>
            <p className="mt-1 text-xs text-[var(--morph-muted,#737373)]">
              {aiLimit > 0
                ? `${aiUsed} / ${aiLimit} AI · Studio ${usage?.morph_studio_used ?? 0}/${usage?.morph_studio_limit ?? 0}`
                : t("profile.tryOnStudioLimit", { defaultValue: "Try-on va Studio limiti" })}
            </p>
          </div>
          <UsageRing pct={pct} />
        </div>
        <p className="mt-3 flex items-center justify-between text-sm font-semibold">
          {active
            ? t("profile.manage", { defaultValue: "Boshqarish" })
            : t("profile.purchase", { defaultValue: "Obuna olish" })}
          <ChevronRight className="size-4" />
        </p>
      </Link>

      <div className="mt-4 grid grid-cols-3 gap-[clamp(0.4rem,2vw,0.75rem)]">
        <Quick to="/wallet" icon={Wallet} label={t("profile.wallet")} />
        <Quick
          to="/ai-style/history"
          icon={Images}
          label={t("morph.looks", { defaultValue: "Looklar" })}
        />
        <Quick to="/ai-style/studio" icon={Sparkles} label={t("nav.morphStudio", { defaultValue: "Studio" })} />
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-black/12 bg-[var(--morph-card,#fff)]">
        <Row to="/settings" icon={Settings} title={t("profile.settings")} subtitle={t("profile.settingsSubtitle", { defaultValue: "Hisob, til, ko‘rinish" })} />
        <Row
          to="/notifications"
          icon={Bell}
          title={t("profile.notifications", { defaultValue: "Bildirishnomalar" })}
          badge={unread > 0 ? String(unread > 9 ? "9+" : unread) : undefined}
        />
        <Row
          to="/settings"
          search={{ section: "security" }}
          icon={Lock}
          title={t("profile.security", { defaultValue: "Xavfsizlik" })}
          last
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("profile.recentLooks", { defaultValue: "So‘nggi looklar" })}</h2>
        <Link to="/ai-style/history" className="text-xs font-semibold text-[var(--morph-muted,#737373)]">
          {t("profile.all", { defaultValue: "Hammasi" })}
        </Link>
      </div>

      {history.length === 0 ? (
        <Link
          to="/ai-style"
          className="mt-3 flex items-center gap-3 rounded-3xl border border-black/12 bg-[var(--morph-card,#fff)] p-[clamp(0.85rem,3vw,1.15rem)]"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-black/5">
            <Camera className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              {t("profile.firstTryOn", { defaultValue: "Birinchi try-on" })}
            </span>
            <span className="block text-xs text-[var(--morph-muted,#737373)]">
              {t("profile.resultsSavedHere", { defaultValue: "Natijalar shu yerda saqlanadi" })}
            </span>
          </span>
          <ChevronRight className="size-4 text-[var(--morph-muted,#737373)]" />
        </Link>
      ) : (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {history.slice(0, 8).map((item) => (
            <Link
              key={item.id}
              to="/ai-style/history"
              className="relative h-[clamp(6.5rem,28vw,8rem)] w-[clamp(5.25rem,22vw,6.5rem)] shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-black/5"
            >
              {item.after_url || item.before_url ? (
                <img
                  src={item.after_url || item.before_url || ""}
                  alt=""
                  className="size-full object-cover"
                />
              ) : null}
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6 text-[11px] font-semibold text-white">
                {item.title || "Look"}
              </span>
            </Link>
          ))}
        </div>
      )}

      {loggedIn ? (
        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FF3B30]/25 py-3 text-sm font-semibold text-[#FF3B30]"
        >
          <LogOut className="size-4" />
          {t("profile.logout", { defaultValue: "Chiqish" })}
        </button>
      ) : (
        <Link
          to="/auth"
          className="mt-6 flex w-full items-center justify-center rounded-full bg-[var(--morph-fg,#111)] py-3 text-sm font-semibold text-[var(--morph-bg,#fff)]"
        >
          {t("common.login", { defaultValue: "Kirish" })}
        </Link>
      )}
    </div>
  );
}

function UsageRing({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="36" textAnchor="middle" fontSize="13" fontWeight="800" fill="currentColor">
        {pct}%
      </text>
    </svg>
  );
}

function Quick({
  to,
  icon: Icon,
  label,
}: {
  to: "/wallet" | "/ai-style/history" | "/ai-style/studio";
  icon: typeof Wallet;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="relative flex h-full min-h-[4.75rem] min-w-0 items-center justify-center rounded-2xl border border-black/12 bg-[var(--morph-card,#fff)] px-1.5 text-center"
    >
      <Icon className="size-6 -translate-y-1.5" strokeWidth={1.5} />
      <span className="absolute inset-x-1 bottom-1.5 text-[11px] font-semibold leading-tight">{label}</span>
    </Link>
  );
}

function Row({
  to,
  search,
  icon: Icon,
  title,
  subtitle,
  badge,
  last,
}: {
  to: "/settings" | "/notifications";
  search?: { section: "security" };
  icon: typeof Settings;
  title: string;
  subtitle?: string;
  badge?: string;
  last?: boolean;
}) {
  return (
    <Link
      to={to}
      search={search}
      className={`flex items-center gap-3 px-[clamp(0.85rem,3vw,1.15rem)] py-3.5 ${last ? "" : "border-b border-black/10"}`}
    >
      <Icon className="size-5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        {subtitle ? (
          <span className="block truncate text-xs text-[var(--morph-muted,#737373)]">{subtitle}</span>
        ) : null}
      </span>
      {badge ? (
        <span className="rounded-full bg-[var(--morph-fg,#111)] px-2 py-0.5 text-[10px] font-bold text-[var(--morph-bg,#fff)]">
          {badge}
        </span>
      ) : null}
      <ChevronRight className="size-4 text-[var(--morph-muted,#737373)]" />
    </Link>
  );
}
