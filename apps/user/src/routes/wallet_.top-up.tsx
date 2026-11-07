import { createFileRoute, Link } from "@tanstack/react-router";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";

export const Route = createFileRoute("/wallet_/top-up")({
  head: () => ({
    meta: [
      { title: "To'ldirish — mysaloon.uz" },
      { name: "description", content: "Karta/chek to'ldirish o'chirilgan. AI Premium Payme orqali." },
    ],
  }),
  component: TopUpPage,
});

function TopUpPage() {
  return (
    <ProfileSubpageLayout title="To'ldirish" subtitle="Karta va chek oqimi o'chirilgan" backTo="/wallet">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-bold">Karta ma'lumotlari va chek yuklash yo'q</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Kompaniya kartasiga o'tkazma va chek tashlash o'chirildi. AI Premium obuna Payme Subscribe
          sahifasida to'lanadi — kartani bizning saytda kiritmaysiz.
        </p>
        <Link
          to="/wallet"
          search={{ section: "subscriptions" } as never}
          className="mt-4 inline-flex h-11 items-center rounded-xl bg-foreground px-4 text-sm font-bold text-background"
        >
          Payme orqali obuna
        </Link>
      </div>
    </ProfileSubpageLayout>
  );
}
