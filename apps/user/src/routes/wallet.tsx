import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { WalletDesktopPage } from "@/components/desktop/pages/WalletDesktopPage";
import { WalletSectionNav } from "@/components/wallet/WalletSectionNav";
import { WalletPanelContent } from "@/components/wallet/WalletPanelContent";
import { WalletPullRefresh } from "@/components/wallet/WalletPullRefresh";
import { parseWalletSection, type WalletSection } from "@/lib/wallet-nav";
import { walletMeQueryKeyFor } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";

const walletSearchSchema = z.object({
  section: z.string().optional(),
  manage: z
    .union([z.boolean(), z.literal("1"), z.literal(1)])
    .optional()
    .transform((v) => v === true || v === "1" || v === 1),
});

export const Route = createFileRoute("/wallet")({
  validateSearch: walletSearchSchema,
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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [, setRefreshing] = useState(false);

  const refreshBalance = async () => {
    await qc.invalidateQueries({ queryKey: walletMeQueryKeyFor(getAuthUserId()) });
    await qc.invalidateQueries({ queryKey: ["wallet", "transactions"] });
  };

  return (
    <WalletPullRefresh onRefresh={refreshBalance} onRefreshingChange={setRefreshing}>
      <div className="min-h-full bg-background pb-[calc(68px+env(safe-area-inset-bottom)+12px)]">
        <div className="border-b border-border px-5 pb-4 pt-[calc(env(safe-area-inset-top)+12px)]">
          <h1 className="text-2xl font-semibold tracking-tight">{t("walletPage.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("walletPage.pullHint")}</p>
        </div>

        <div className="px-3 py-4">
          <WalletSectionNav active={section} t={t} compact />
        </div>

        <div className="border-t border-border px-5 py-6">
          <WalletPanelContent section={section} />
        </div>
      </div>
    </WalletPullRefresh>
  );
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
