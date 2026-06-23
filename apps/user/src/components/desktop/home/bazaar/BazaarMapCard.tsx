import { cn } from "@/lib/utils";
import { BazaarMapPanel } from "./BazaarMapPanel";

type Props = {
  salons: Parameters<typeof BazaarMapPanel>[0]["salons"];
  salonCount: number;
  className?: string;
};

/** Xarita — marketplace kartochkasi o'lchamida (aspect 5/4). */
export function BazaarMapCard({ salons, salonCount, className }: Props) {
  return (
    <div className={cn("relative aspect-[5/4] w-full overflow-hidden rounded-2xl", className)}>
      <BazaarMapPanel
        salons={salons}
        salonCount={salonCount}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
