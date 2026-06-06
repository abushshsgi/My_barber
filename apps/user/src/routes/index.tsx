import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HomeVariantActionHub } from "@/components/home/HomeVariantActionHub";
import { HomeVariantDiscovery } from "@/components/home/HomeVariantDiscovery";
import { HomeVariantEditorial } from "@/components/home/HomeVariantEditorial";
import { HomeVariantPicker } from "@/components/home/HomeVariantPicker";
import {
  homeVariantMeta,
  readHomeVariant,
  saveHomeVariant,
  type HomePageVariant,
} from "@/components/home/home-variants";
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
  const { t } = useTranslation();
  const [variant, setVariant] = useState<HomePageVariant>(() => readHomeVariant());
  const data = useHomeData();

  const onVariantChange = (next: HomePageVariant) => {
    setVariant(next);
    saveHomeVariant(next);
  };

  return (
    <div className="pb-4">
      <HomeVariantPicker value={variant} onChange={onVariantChange} />
      <p className="mx-5 mb-3 text-center text-[11px] font-medium text-muted-foreground">
        {t(homeVariantMeta[variant].hintKey)}
      </p>

      {variant === "v01" ? (
        <HomeVariantDiscovery data={data} />
      ) : variant === "v02" ? (
        <HomeVariantActionHub data={data} />
      ) : (
        <HomeVariantEditorial data={data} />
      )}
    </div>
  );
}
