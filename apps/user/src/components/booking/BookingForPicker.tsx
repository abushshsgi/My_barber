import { UserRound, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFamilyMembers } from "@/hooks/use-family";
import { useDisplayUser } from "@/hooks/use-me";
import type { ApiFamilyMember } from "@/lib/api/family";
import { cn } from "@/lib/utils";

type Props = {
  value: number | null;
  onChange: (id: number | null) => void;
  className?: string;
};

export function BookingForPicker({ value, onChange, className }: Props) {
  const { t } = useTranslation();
  const user = useDisplayUser();
  const { data: members = [] } = useFamilyMembers();

  const options: { id: number | null; name: string; hint?: string }[] = [
    {
      id: null,
      name: user.name || t("booking.forSelf", { defaultValue: "O'zim uchun" }),
      hint: user.phone || undefined,
    },
    ...members.map((m: ApiFamilyMember) => ({
      id: m.id,
      name: m.name,
      hint: [m.relation_label, m.audience_label].filter(Boolean).join(" · "),
    })),
  ];

  return (
    <div className={className}>
      <h2 className="text-xl font-bold">{t("booking.forWhom", { defaultValue: "Kim uchun?" })}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("booking.forWhomHint", { defaultValue: "O'zingiz yoki oila a'zosi uchun bron qiling." })}
      </p>
      <div className="mt-4 space-y-2">
        {options.map((opt) => {
          const selected = value === opt.id;
          return (
            <button
              key={opt.id ?? "self"}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
                selected ? "border-foreground bg-surface" : "border-transparent bg-surface",
              )}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background">
                {opt.id == null ? <UserRound className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">{opt.name}</p>
                {opt.hint ? <p className="text-xs text-muted-foreground">{opt.hint}</p> : null}
              </div>
            </button>
          );
        })}
      </div>
      {members.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("booking.addFamilyHint", {
            defaultValue: "Oila a'zolarini Sozlamalar → Oilaviy profil bo'limidan qo'shishingiz mumkin.",
          })}
        </p>
      ) : null}
    </div>
  );
}
