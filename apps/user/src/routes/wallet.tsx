import { createFileRoute, redirect } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { WalletDesktopPage } from "@/components/desktop/pages/WalletDesktopPage";
import { WalletMobileOverview } from "@/components/wallet/WalletMobileOverview";
import { WalletMobileSubpage } from "@/components/wallet/WalletMobileSubpage";
import { parseWalletSearch, parseWalletSection, type WalletSection } from "@/lib/wallet-nav";
import { resolveActivityBackTo } from "@/lib/activity-nav";

export const Route = createFileRoute("/wallet")({
  validateSearch: (search: Record<string, unknown>) => parseWalletSearch(search),
  beforeLoad: ({ search }) => {
    if (search.section === "offers") {
      throw redirect({ to: "/offers" });
    }
    if (search.section === "subscriptions") {
      throw redirect({
        to: "/subscriptions",
        search: {
          plan: search.plan,
          returnTo: search.returnTo,
        },
      });
    }
  },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Hamyon — mysaloon.uz" },
      { name: "description", content: "Hamyon balansi, sovg'a kartalar va to'lov tarixi." },
    ],
  }),
  component: WalletPage,
});

function WalletMobile({ section, backTo }: { section: WalletSection; backTo: string }) {
  if (section === "overview") {
    return <WalletMobileOverview />;
  }
  return <WalletMobileSubpage section={section} backTo={backTo} />;
}

function WalletPage() {
  const search = Route.useSearch();
  const section = parseWalletSection(search.section, search.manage);
  const giftBackTo = resolveActivityBackTo(search, "/wallet");

  return (
    <DesktopPageSplit
      mobile={
        <WalletMobile section={section} backTo={section === "gift" ? giftBackTo : "/wallet"} />
      }
      desktop={<WalletDesktopPage section={section} />}
    />
  );
}
