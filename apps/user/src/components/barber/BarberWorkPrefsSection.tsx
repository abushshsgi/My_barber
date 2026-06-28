import { Banknote, CreditCard, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

type WorkLocation = { code: string; label: string } | null;
type PaymentMethod = { code: string; label: string };

export function BarberWorkPrefsSection({
  workLocation,
  paymentMethods,
}: {
  workLocation: WorkLocation;
  paymentMethods: PaymentMethod[];
}) {
  const { t } = useTranslation();
  if (!workLocation && paymentMethods.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-[22px] font-semibold tracking-tight">
        {t("barber.workPrefs.title", { defaultValue: "Ish sharoiti" })}
      </h2>
      {workLocation ? (
        <div className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 text-sm font-medium">
          <MapPin className="size-5 shrink-0 text-muted-foreground" />
          <span>{workLocation.label}</span>
        </div>
      ) : null}
      {paymentMethods.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("barber.workPrefs.payment", { defaultValue: "To'lov" })}
          </p>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map((m) => (
              <span
                key={m.code}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold"
              >
                {m.code === "cash" ? (
                  <Banknote className="size-3.5" />
                ) : (
                  <CreditCard className="size-3.5" />
                )}
                {m.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
