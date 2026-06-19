import { cn } from "@/lib/utils";

type Props = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function DesktopEmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center lg:py-24",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-surface text-muted-foreground lg:h-20 lg:w-20">
          {icon}
        </div>
      ) : null}
      <h2 className="text-lg font-bold tracking-tight lg:text-xl">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground lg:text-base">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
