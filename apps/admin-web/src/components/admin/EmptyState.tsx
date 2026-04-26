import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  className,
  icon,
  action,
}: {
  title: string;
  description?: string;
  className?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center text-center py-16 px-6", className)}
    >
      <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <h3 className="font-heading text-base font-medium text-foreground">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
