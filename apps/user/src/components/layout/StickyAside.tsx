import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  topOffset?: string;
};

export function StickyAside({ children, className, topOffset = "lg:top-20" }: Props) {
  return (
    <aside className={cn("lg:sticky lg:self-start", topOffset, className)}>
      {children}
    </aside>
  );
}
