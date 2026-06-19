type Props = {
  title: string;
  description?: string;
  breadcrumb?: { label: string; to?: string }[];
};

export function DesktopPageHeader({ title, description, breadcrumb }: Props) {
  return (
    <header>
      {breadcrumb && breadcrumb.length > 0 ? (
        <nav className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground">
          {breadcrumb.map((item, i) => (
            <span key={item.label} className="flex items-center gap-2">
              {i > 0 ? <span>/</span> : null}
              <span className={i === breadcrumb.length - 1 ? "text-foreground" : undefined}>{item.label}</span>
            </span>
          ))}
        </nav>
      ) : null}
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </header>
  );
}
