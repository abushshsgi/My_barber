import { Link, useRouterState } from "@tanstack/react-router";
import {
  ACCOUNT_NAV_LOGOUT,
  ACCOUNT_NAV_SECTIONS,
  isAccountNavActive,
  type AccountNavItemDef,
} from "@/lib/account-nav";
import { cn } from "@/lib/utils";

type TranslateFn = (key: string, opts?: { defaultValue?: string }) => string;

type Props = {
  t: TranslateFn;
  unreadNotifications?: number;
  onLogout?: () => void;
  /** sidebar = sticky panel; dropdown = header popover */
  variant?: "sidebar" | "dropdown";
  onNavigate?: () => void;
};

const ITEM_CLASS =
  "flex w-full items-center gap-3 px-5 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted/55";

function NavRow({
  def,
  label,
  active,
  badge,
  onNavigate,
  asButton,
  onClick,
}: {
  def: AccountNavItemDef | typeof ACCOUNT_NAV_LOGOUT;
  label: string;
  active?: boolean;
  badge?: number;
  onNavigate?: () => void;
  asButton?: boolean;
  onClick?: () => void;
}) {
  const Icon = def.icon;
  const className = cn(
    ITEM_CLASS,
    active && "font-semibold",
    asButton && "cursor-pointer",
  );

  const content = (
    <>
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
      {badge ? (
        <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-background">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </>
  );

  if (asButton) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  const to = "to" in def ? def.to : undefined;
  if (!to) return null;

  return (
    <Link to={to as never} className={className} onClick={onNavigate}>
      {content}
    </Link>
  );
}

export function AccountNavList({
  t,
  unreadNotifications = 0,
  onLogout,
  variant = "sidebar",
  onNavigate,
}: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const resolveItem = (def: AccountNavItemDef) => ({
    def,
    label: t(def.labelKey, { defaultValue: def.defaultLabel }),
    active: isAccountNavActive(pathname, def.to),
    badge:
      def.badgeFromNotifications && unreadNotifications > 0 ? unreadNotifications : undefined,
  });

  const panelClass =
    variant === "sidebar"
      ? "overflow-hidden rounded-xl border border-border/80 bg-background shadow-[0_6px_20px_rgba(15,15,15,0.08)]"
      : "py-1";

  return (
    <nav
      className={panelClass}
      aria-label={t("profile.title", { defaultValue: "Profil" })}
    >
      {ACCOUNT_NAV_SECTIONS.map((section, sectionIndex) => (
        <div key={sectionIndex}>
          {sectionIndex > 0 ? <div className="h-px bg-border" role="separator" /> : null}
          <ul>
            {section.items.map((def) => {
              const item = resolveItem(def);
              return (
                <li key={def.to}>
                  <NavRow
                    def={item.def}
                    label={item.label}
                    active={item.active}
                    badge={item.badge}
                    onNavigate={onNavigate}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {onLogout ? (
        <>
          <div className="h-px bg-border" role="separator" />
          <NavRow
            def={ACCOUNT_NAV_LOGOUT}
            label={t(ACCOUNT_NAV_LOGOUT.labelKey, { defaultValue: ACCOUNT_NAV_LOGOUT.defaultLabel })}
            asButton
            onClick={() => {
              onLogout();
              onNavigate?.();
            }}
          />
        </>
      ) : null}
    </nav>
  );
}
