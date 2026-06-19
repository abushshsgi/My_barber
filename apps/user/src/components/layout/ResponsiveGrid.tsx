import { cn } from "@/lib/utils";

type Cols = {
  default?: 1 | 2 | 3 | 4 | 5 | 6;
  sm?: 1 | 2 | 3 | 4 | 5 | 6;
  lg?: 1 | 2 | 3 | 4 | 5 | 6;
  xl?: 1 | 2 | 3 | 4 | 5 | 6;
};

const defaultCols: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

const smCols: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
};

const lgCols: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

const xlCols: Record<number, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
};

type Props = {
  cols?: Cols;
  gap?: string;
  children: React.ReactNode;
  className?: string;
};

export function ResponsiveGrid({ cols = { default: 1, lg: 2 }, gap = "gap-4", children, className }: Props) {
  const d = cols.default ?? 1;
  const s = cols.sm;
  const l = cols.lg;
  const x = cols.xl;

  return (
    <div
      className={cn(
        "grid",
        gap,
        defaultCols[d],
        s ? smCols[s] : null,
        l ? lgCols[l] : null,
        x ? xlCols[x] : null,
        className,
      )}
    >
      {children}
    </div>
  );
}
