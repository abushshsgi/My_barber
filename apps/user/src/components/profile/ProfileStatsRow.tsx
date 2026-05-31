import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type StatLink = { label: string; value: number | undefined; to: string };

type Props = {
  loading: boolean;
  links: StatLink[];
};

export function ProfileStatsRow({ loading, links }: Props) {
  return (
    <div className="mx-5 mt-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-border">
      {links.map((s, i) => (
        <Link
          key={s.to + s.label}
          to={s.to}
          className={cn(
            "py-4 text-center transition-colors active:bg-surface",
            i < links.length - 1 && "border-r border-border",
          )}
        >
          <p className="text-2xl font-bold">{loading ? "—" : (s.value ?? 0)}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {s.label}
          </p>
        </Link>
      ))}
    </div>
  );
}
