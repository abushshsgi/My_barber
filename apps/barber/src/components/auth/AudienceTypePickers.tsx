import { cn } from "@/lib/utils";

export type BarberGenderValue = "male" | "female";

const GENDER_OPTIONS: Array<{
  value: BarberGenderValue;
  title: string;
  subtitle: string;
}> = [
  {
    value: "male",
    title: "Erkak usta",
    subtitle: "Erkak mijozlar uchun",
  },
  {
    value: "female",
    title: "Ayol usta",
    subtitle: "Ayol mijozlar uchun",
  },
];

function ChoiceCard({
  selected,
  title,
  subtitle,
  onClick,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-left transition",
        selected
          ? "border-foreground bg-foreground text-background shadow-sm"
          : "border-border bg-background text-foreground hover:border-foreground/40 hover:bg-muted/40",
      )}
    >
      <span className="text-sm font-semibold tracking-tight">{title}</span>
      <span
        className={cn(
          "text-[11px] leading-snug",
          selected ? "text-background/75" : "text-muted-foreground",
        )}
      >
        {subtitle}
      </span>
    </button>
  );
}

export function BarberGenderPicker({
  value,
  onChange,
  className,
}: {
  value: BarberGenderValue | "";
  onChange: (v: BarberGenderValue) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium text-muted-foreground">Usta jinsi *</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {GENDER_OPTIONS.map((opt) => (
          <ChoiceCard
            key={opt.value}
            selected={value === opt.value}
            title={opt.title}
            subtitle={opt.subtitle}
            onClick={() => onChange(opt.value)}
          />
        ))}
      </div>
    </div>
  );
}
