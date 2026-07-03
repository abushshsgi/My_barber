import { Link } from "@tanstack/react-router";
import { Bell, MessageSquare } from "lucide-react";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { cn } from "@/lib/utils";

function IconBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[9px] font-bold leading-none text-background">
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** Mobil bosh sahifa — logo + chat/bildirishnomalar (dockda chat yo‘q). */
export function HomeMobileTopBar() {
  const { chatUnread, notificationsUnread } = useNavBadges();

  return (
    <header
      className="flex items-center justify-between px-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}
    >
      <Link to="/" className="flex items-baseline gap-0.5">
        <span className="text-[1.35rem] font-bold tracking-tight text-foreground">mysaloon</span>
        <span className="text-sm font-bold text-muted-foreground">.uz</span>
      </Link>
      <div className="flex items-center gap-1.5">
        <Link
          to="/chat"
          aria-label="Chat"
          className={cn(
            "relative grid size-10 place-items-center rounded-full border border-border bg-surface",
            "active:scale-95 transition-transform",
          )}
        >
          <MessageSquare className="size-[18px] text-foreground" strokeWidth={2} />
          <IconBadge count={chatUnread} />
        </Link>
        <Link
          to="/notifications"
          aria-label="Bildirishnomalar"
          className={cn(
            "relative grid size-10 place-items-center rounded-full border border-border bg-surface",
            "active:scale-95 transition-transform",
          )}
        >
          <Bell className="size-[18px] text-foreground" strokeWidth={2} />
          <IconBadge count={notificationsUnread} />
        </Link>
      </div>
    </header>
  );
}
