import type { SalonMapMarker } from "@/components/map/SalonMap";
import { cn } from "@/lib/utils";

type Props = {
  markers: SalonMapMarker[];
  className?: string;
};

/** Home preview — WebGL o‘rniga yengil statik ko‘rinish (navigatsiya tezligi uchun). */
export function MapStaticPreview({ markers, className }: Props) {
  const points = markers.slice(0, 14);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-[linear-gradient(145deg,oklch(0.94_0.02_85),oklch(0.88_0.03_240))]",
        className,
      )}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.7 0.02 85 / 0.35) 1px, transparent 1px), linear-gradient(90deg, oklch(0.7 0.02 85 / 0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {points.map((m, i) => {
        const t = points.length > 1 ? i / (points.length - 1) : 0.5;
        const left = 12 + t * 76 + ((i * 17) % 11);
        const top = 18 + ((i * 23) % 58);
        return (
          <span
            key={m.id}
            className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_0_3px_rgba(255,255,255,0.9)]"
            style={{ left: `${left}%`, top: `${top}%` }}
          />
        );
      })}
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/80 ring-4 ring-foreground/15" />
    </div>
  );
}
