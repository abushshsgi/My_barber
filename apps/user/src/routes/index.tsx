import { createFileRoute } from "@tanstack/react-router";
import { HomeVariantEditorial } from "@/components/home/HomeVariantEditorial";
import { useHomeData } from "@/components/home/useHomeData";

export const Route = createFileRoute("/")({
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
    <div className="pb-4">
      <HomeVariantEditorial data={data} />
    </div>
  );
}
