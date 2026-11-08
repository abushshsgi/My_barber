import { createFileRoute, redirect } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { HomeDesktopRoot } from "@/components/desktop/home/HomeDesktopRoot";
import { MysaloonPausedScreen } from "@/components/mobile/MysaloonPausedScreen";
import { useHomeData } from "@/components/home/useHomeData";
import { shouldRedirectHomeToMorph } from "@/lib/app-shell";
import { parseReferralFromLocationSearch, stashReferralCode } from "@/lib/referral-storage";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const code = parseReferralFromLocationSearch(window.location.search);
    if (code) stashReferralCode(code);
    if (shouldRedirectHomeToMorph()) {
      throw redirect({ to: "/ai-style", replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "mysaloon.uz — Sartaroshxona va salon bron qiling" },
      {
        name: "description",
        content:
          "O'zbekistondagi sartaroshlar va go'zallik salonlarini online bron qiluvchi platforma.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const data = useHomeData();
  return (
    <DesktopPageSplit
      mobile={<MysaloonPausedScreen />}
      desktop={<HomeDesktopRoot data={data} />}
    />
  );
}
