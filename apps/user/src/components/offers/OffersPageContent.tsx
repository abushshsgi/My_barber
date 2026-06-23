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
import { ProfileSubpageCard } from "@/components/profile/ProfileSubpageLayout";
import { EmptyState } from "@/components/EmptyState";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { useAudience, matchAudience } from "@/hooks/use-audience";

/** Backend offers API hali yo'q — bo'sh ro'yxat (mock olib tashlangan). */
const offers: never[] = [];

export function OffersPageContent() {
  const { t } = useTranslation();
  const { audience } = useAudience();
  const [variant, setVariant] = useState<OffersPageVariant>(() => readOffersVariant());
  const list = offers.filter((o) => matchAudience(o.audience, audience));

  const onVariantChange = (next: OffersPageVariant) => {
    setVariant(next);
    saveOffersVariant(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t(offersVariantMeta[variant].hintKey)}</p>
      <OffersVariantPicker value={variant} onChange={onVariantChange} />

      <ProfileSubpageCard>
        <AudienceSwitch />
      </ProfileSubpageCard>

      {list.length === 0 ? (
        <EmptyState icon={<Tag className="h-7 w-7" />} title={t("offersPage.empty")} />
      ) : (
        <div>
          {variant === "v01" ? (
            <OffersVariantFeatured list={list} />
          ) : variant === "v02" ? (
            <OffersVariantPromo list={list} />
          ) : (
            <OffersVariantSwipe list={list} />
          )}
        </div>
      )}
    </div>
  );
}
