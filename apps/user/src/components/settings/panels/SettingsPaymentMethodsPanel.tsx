import { Link } from "@tanstack/react-router";
import { ProfileSubpageCard } from "@/components/profile/ProfileSubpageLayout";

export function SettingsPaymentMethodsPanel() {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Karta raqamini kiritish, chek yuklash, Click va hamyondan AI obuna to'lash o'chirilgan.
      </p>
      <ProfileSubpageCard>
        <p className="text-sm font-bold">AI Premium — Payme Subscribe</p>
        <p className="mt-1 text-xs text-muted-foreground">
          To'lov Payme sahifasida: receipts.create → checkout.test.paycom.uz/chek_id → state=4.
        </p>
        <Link
          to="/subscriptions"
          className="mt-3 inline-flex h-10 items-center rounded-xl bg-foreground px-4 text-sm font-bold text-background"
        >
          Obuna sahifasi
        </Link>
      </ProfileSubpageCard>
    </div>
  );
}
