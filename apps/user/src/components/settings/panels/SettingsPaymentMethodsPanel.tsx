import { useQuery } from "@tanstack/react-query";
import { CreditCard, Plus, Smartphone, Wallet as WalletIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ProfileSubpageCard } from "@/components/profile/ProfileSubpageLayout";
import { useWalletMe } from "@/hooks/use-wallet";
import { fetchPaymentProviders, startPaymentCheckout } from "@/lib/api/payments";
import { parseWalletBalance } from "@/lib/api/wallet";

export function SettingsPaymentMethodsPanel() {
  const { t } = useTranslation();
  const { data: wallet } = useWalletMe();
  const providersQ = useQuery({
    queryKey: ["payments", "providers"],
    queryFn: fetchPaymentProviders,
  });

  const walletBalance = wallet ? parseWalletBalance(wallet.balance) : 0;

  const onProviderClick = async (provider: "click" | "payme", configured: boolean) => {
    if (!configured) {
      toast.message("To'lov provayderi hali sozlanmagan", {
        description: "Production'da Click/Payme kalitlari kerak. Hozir hamyon balansidan foydalaning.",
      });
      return;
    }
    try {
      const res = await startPaymentCheckout({ provider, amount: 1000, order_id: `wallet-topup-${Date.now()}` });
      if (res.checkout_url) {
        window.location.assign(res.checkout_url);
      } else {
        toast.message(res.message);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">{t("paymentMethods.mockNote")}</p>

      {wallet ? (
        <ProfileSubpageCard className="border-foreground bg-surface/40">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-background">
              <WalletIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold">{t("walletPage.title")}</p>
              <p className="text-xs text-muted-foreground">
                {wallet.card.card_display} · {walletBalance.toLocaleString("uz-UZ")} so'm
              </p>
            </div>
          </div>
        </ProfileSubpageCard>
      ) : null}

      <div className="space-y-3">
        {(providersQ.data ?? []).map((pm) => {
          const Icon = pm.id === "click" || pm.id === "payme" ? Smartphone : CreditCard;
          return (
            <ProfileSubpageCard key={pm.id}>
              <button
                type="button"
                onClick={() => void onProviderClick(pm.id as "click" | "payme", pm.configured)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{pm.label}</p>
                    {!pm.configured ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                        Sozlash kerak
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {pm.configured ? "Onlayn to'ldirish" : "Production kalitlari kutilmoqda"}
                  </p>
                </div>
              </button>
            </ProfileSubpageCard>
          );
        })}

        <ProfileSubpageCard className="border-dashed">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Plus className="h-4 w-4" />
            <p className="text-sm">{t("paymentMethods.add")} — tez orada</p>
          </div>
        </ProfileSubpageCard>
      </div>
    </div>
  );
}
