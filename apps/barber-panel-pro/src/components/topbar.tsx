import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useBarberStore } from "@/lib/barber-store";

export function Topbar({ title }: { title: string }) {
  const { view } = useBarberStore();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-display text-base font-semibold tracking-tight">{title}</h1>
        {view === "salon" && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Read-only
          </span>
        )}
      </div>
      <Link to="/notifications" className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <Bell className="h-4 w-4" strokeWidth={1.5} />
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-foreground" />
      </Link>
    </header>
  );
}
