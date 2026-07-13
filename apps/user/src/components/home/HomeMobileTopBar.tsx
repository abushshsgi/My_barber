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

/** Mobil bosh sahifa — sticky brand + chat/bildirishnomalar. */
export function HomeMobileTopBar() {
  const { chatUnread, notificationsUnread } = useNavBadges();

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/90 px-4 pb-2.5 backdrop-blur-md"
      style={{ paddingTop: "max(env(safe-area-inset-top), 10px)" }}
    >
      <Link to="/" className="flex min-w-0 items-baseline gap-0.5">
        <span className="text-[1.35rem] font-extrabold tracking-tight text-foreground">mysaloon</span>
        <span className="text-[11px] font-bold text-muted-foreground">.uz</span>
      </Link>
      <div className="flex items-center gap-1.5">
        <Link
          to="/chat"
          aria-label="Chat"
          className={cn(
            "relative grid size-10 place-items-center rounded-2xl bg-surface",
            "active:scale-95 transition-transform",
          )}
        >
          <MessageSquare className="size-[17px] text-foreground" strokeWidth={2} />
          <IconBadge count={chatUnread} />
        </Link>
        <Link
          to="/notifications"
          aria-label="Bildirishnomalar"
          className={cn(
            "relative grid size-10 place-items-center rounded-2xl bg-surface",
            "active:scale-95 transition-transform",
          )}
        >
          <Bell className="size-[17px] text-foreground" strokeWidth={2} />
          <IconBadge count={notificationsUnread} />
        </Link>
      </div>
    </header>
  );
}
