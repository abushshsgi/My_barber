import { createFileRoute, redirect } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { HomeDesktopRoot } from "@/components/desktop/home/HomeDesktopRoot";
import { HomeVariantEditorial } from "@/components/home/HomeVariantEditorial";
import { useHomeData } from "@/components/home/useHomeData";
import {
  parseReferralFromLocationSearch,
  stashReferralCode,
} from "@/lib/referral-storage";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const code = parseReferralFromLocationSearch(window.location.search);
    if (!code) return;
    stashReferralCode(code);
    throw redirect({ to: "/auth", search: { ref: code } });
  },
  head: () => ({
    meta: [
      { title: "mysaloon.uz — Sartaroshxona va salon bron qiling" },
      {
        name: "description",
        content: "O'zbekistondagi sartaroshlar va go'zallik salonlarini online bron qiluvchi platforma.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const data = useHomeData();
  return (
    <DesktopPageSplit
      mobile={<HomeVariantEditorial data={data} />}
      desktop={<HomeDesktopRoot data={data} />}
    />
  );
}
