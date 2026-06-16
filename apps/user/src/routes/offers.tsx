import { createFileRoute } from "@tanstack/react-router";
import { Tag } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { OffersVariantFeatured } from "@/components/offers/OffersVariantFeatured";
import { OffersVariantPromo } from "@/components/offers/OffersVariantPromo";
import { OffersVariantSwipe } from "@/components/offers/OffersVariantSwipe";
import { OffersVariantPicker } from "@/components/offers/OffersVariantPicker";
import {
  offersVariantMeta,
  readOffersVariant,
  saveOffersVariant,
  type OffersPageVariant,
} from "@/components/offers/offers-variants";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { EmptyState } from "@/components/EmptyState";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { useAudience, matchAudience } from "@/hooks/use-audience";

/** Backend offers API hali yo'q — bo'sh ro'yxat (mock olib tashlangan). */
const offers: never[] = [];

export const Route = createFileRoute("/offers")({
  head: () => ({ meta: [{ title: "Aksiyalar — mysaloon.uz" }] }),
  component: OffersPage,
});

function OffersPage() {
  const { t } = useTranslation();
  const { audience } = useAudience();
  const [variant, setVariant] = useState<OffersPageVariant>(() => readOffersVariant());
  const list = offers.filter((o) => matchAudience(o.audience, audience));

  const onVariantChange = (next: OffersPageVariant) => {
    setVariant(next);
    saveOffersVariant(next);
  };

  return (
    <ProfileSubpageLayout title={t("offersPage.title")} subtitle={t(offersVariantMeta[variant].hintKey)}>
      <OffersVariantPicker value={variant} onChange={onVariantChange} />

      <ProfileSubpageCard className="mb-4">
        <AudienceSwitch />
      </ProfileSubpageCard>

      {list.length === 0 ? (
        <EmptyState icon={<Tag className="h-7 w-7" />} title={t("offersPage.empty")} />
      ) : variant === "v01" ? (
        <OffersVariantFeatured list={list} />
      ) : variant === "v02" ? (
        <OffersVariantPromo list={list} />
      ) : (
        <OffersVariantSwipe list={list} />
      )}
    </ProfileSubpageLayout>
  );
}
