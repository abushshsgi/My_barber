"use client";

import { Megaphone } from "lucide-react";
import { PageHeader, SectionCard } from "@/adminhub-ui/barber/primitives";

export default function MarketingPage() {
  return (
    <div className="page-container space-y-6">
      <PageHeader title="Marketing" description="Promo va aksiyalar." />

      <SectionCard title="Promo kodlar" description="Bu bo‘lim uchun backend promo API kerak bo‘ladi.">
        <div className="text-sm text-muted-foreground">
          Admin-hub UI’da promo kodlar va kampaniyalar bor. Sizning backend’da hozircha promo CRUD endpoint
          ko‘rinmayapti. Xohlasangiz keyingi bosqichda promo model + API qo‘shamiz.
        </div>
      </SectionCard>

      <SectionCard title="Reklama materiallari" description="Banner/portfolio/QR kabi marketing assetlar.">
        <div className="text-sm text-muted-foreground">
          Hozircha statik UI. Qaysi marketing funksiyalarini kerakligini aytsangiz, shunga mos API va storage ulaymiz.
        </div>
      </SectionCard>
    </div>
  );
}

