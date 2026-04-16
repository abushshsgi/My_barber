export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
      </div>
      <p className="mt-4 text-sm font-medium">{title}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
    </div>
  );
}

