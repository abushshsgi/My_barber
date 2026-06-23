import { createFileRoute } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { HomeDesktopRoot } from "@/components/desktop/home/HomeDesktopRoot";
import { HomeVariantEditorial } from "@/components/home/HomeVariantEditorial";
import { useHomeData } from "@/components/home/useHomeData";
import { parseHomeGiLayout } from "@/lib/home-gi-layouts";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = search.gi;
    if (raw == null || raw === "") return {};
    return { gi: parseHomeGiLayout(raw) };
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
      mobile={
        <div className="pb-4">
          <HomeVariantEditorial data={data} />
        </div>
      }
      desktop={<HomeDesktopRoot data={data} />}
    />
  );
}
