import { cn } from "@/lib/utils";

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-4 py-8 text-center lg:px-8 lg:py-16", className)}>
      {icon && (
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-surface text-muted-foreground lg:mb-4 lg:h-16 lg:w-16">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold tracking-tight lg:text-lg">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4 lg:mt-6">{action}</div>}
    </div>
  );
}
