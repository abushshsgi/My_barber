import { Link } from "@tanstack/react-router";
import { Bell, MessageSquare } from "lucide-react";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
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

/** Mobil bosh sahifa — sticky brand + chat/bildirishnomalar. */
export function HomeMobileTopBar() {
  const { chatUnread, notificationsUnread } = useNavBadges();

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b border-border/50 bg-background/92 px-4 pb-2 backdrop-blur-md"
      style={{ paddingTop: "max(env(safe-area-inset-top), 8px)" }}
    >
      <Link to="/" className="flex min-w-0 items-center" aria-label="Mysaloon">
        <MysaloonLogo size="sm" withAppMark />
      </Link>
      <div className="flex items-center gap-1">
        <Link
          to="/chat"
          aria-label="Chat"
          className={cn(
            "relative grid size-9 place-items-center rounded-xl bg-transparent",
            "active:scale-95 transition-transform",
          )}
        >
          <MessageSquare className="size-4 text-foreground" strokeWidth={2} />
          <IconBadge count={chatUnread} />
        </Link>
        <Link
          to="/notifications"
          aria-label="Bildirishnomalar"
          className={cn(
            "relative grid size-9 place-items-center rounded-xl bg-transparent",
            "active:scale-95 transition-transform",
          )}
        >
          <Bell className="size-4 text-foreground" strokeWidth={2} />
          <IconBadge count={notificationsUnread} />
        </Link>
      </div>
    </header>
  );
}
