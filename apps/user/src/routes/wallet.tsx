import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { WalletDesktopPage } from "@/components/desktop/pages/WalletDesktopPage";
import { WalletMobileOverview } from "@/components/wallet/WalletMobileOverview";
import { WalletMobileSubpage } from "@/components/wallet/WalletMobileSubpage";
import { parseWalletSection, type WalletSection } from "@/lib/wallet-nav";

const walletSearchSchema = z.object({
  section: z.string().optional(),
  manage: z
    .union([z.boolean(), z.literal("1"), z.literal(1)])
    .optional()
    .transform((v) => v === true || v === "1" || v === 1),
});

export const Route = createFileRoute("/wallet")({
  validateSearch: walletSearchSchema,
  beforeLoad: ({ search }) => {
    if (search.section === "offers") {
      throw redirect({ to: "/offers" });
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

function WalletMobile({ section }: { section: WalletSection }) {
  if (section === "overview") {
    return <WalletMobileOverview />;
  }
  return <WalletMobileSubpage section={section} />;
}

function WalletPage() {
  const search = Route.useSearch();
  const section = parseWalletSection(search.section, search.manage);

  return (
    <DesktopPageSplit
      mobile={<WalletMobile section={section} />}
      desktop={<WalletDesktopPage section={section} />}
    />
  );
}
