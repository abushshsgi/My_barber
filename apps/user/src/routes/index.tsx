import { lazy, Suspense } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { MysaloonPausedScreen } from "@/components/mobile/MysaloonPausedScreen";
import { useHomeData } from "@/components/home/useHomeData";
import { shouldRedirectHomeToMorph } from "@/lib/app-shell";
import { parseReferralFromLocationSearch, stashReferralCode } from "@/lib/referral-storage";

const HomeDesktopRoot = lazy(() =>
  import("@/components/desktop/home/HomeDesktopRoot").then((m) => ({
    default: m.HomeDesktopRoot,
  })),
);

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

function HomeDesktop() {
  const data = useHomeData();
  return (
    <Suspense fallback={null}>
      <HomeDesktopRoot data={data} />
    </Suspense>
  );
}

function Home() {
  return <DesktopPageSplit mobile={<MysaloonPausedScreen />} desktop={<HomeDesktop />} />;
}
