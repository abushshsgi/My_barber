import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import {
  SALON_PEEK_VARIANT_LABELS,
  SALON_PEEK_VARIANTS,
  type SalonPeekVariant,
} from "@/components/map/SalonPeekCardLayouts";
import type { Salon } from "@/lib/mock-data";

export const Route = createFileRoute("/map/peek-variants")({
  head: () => ({ meta: [{ title: "Map peek layoutlari — mysaloon.uz" }] }),
  component: MapPeekVariantsPage,
});

const PREVIEW_SALONS: Salon[] = [
  {
    id: "4",
    name: "abdubarber (4)",
    category: "barber",
    audience: "unisex",
    rating: 4.8,
    reviewCount: 12,
    address: "buxoro",
    distanceKm: 1.2,
    priceFrom: 45000,
    priceTo: 120000,
    coverSeed: "abdubarber-2",
    coverUrl:
      "https://images.unsplash.com/photo-1522337360788-8faa13fd3ef7?auto=format&fit=crop&w=900&h=675&q=80",
    about: "",
    services: [],
    staff: [],
    reviews: [],
    portfolio: [],
    lat: 41.3111,
    lng: 69.2797,
  },
  {
    id: "2",
    name: "abdubarber (2)",
    category: "barber",
    audience: "unisex",
    rating: 4.5,
    reviewCount: 8,
    address: "buxoro",
    distanceKm: 2.4,
    priceFrom: 35000,
    priceTo: 90000,
    coverSeed: "abdubarber-1",
    coverUrl:
      "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=900&h=675&q=80",
    about: "",
    services: [],
    staff: [],
    reviews: [],
    portfolio: [],
    lat: 41.3111,
    lng: 69.2797,
  },
  {
    id: "1",
    name: "abdubarber",
    category: "barber",
    audience: "unisex",
    rating: 0,
    reviewCount: 0,
    address: "buxoro",
    distanceKm: 0,
    priceFrom: 0,
    priceTo: 0,
    coverSeed: "abdubarber",
    coverUrl:
      "https://images.unsplash.com/photo-1503957904860-b89353870476?auto=format&fit=crop&w=900&h=675&q=80",
    about: "",
    services: [],
    staff: [],
    reviews: [],
    portfolio: [],
    lat: 41.3111,
    lng: 69.2797,
  },
];

const VARIANT_ORDER: SalonPeekVariant[] = ["a", "b", "c", "d", "e"];

function MapPeekVariantsPage() {
  return (
    <div className="pb-10">
      <PageHeader showBack title="Map sheet kartochkalari" />
      <div className="space-y-8 px-4">
        <p className="text-sm text-muted-foreground">
          Pastdan chiqadigan salon kartochkalari uchun 5 ta layout. Keyin tanlangan variantni map
          sheetga qo&apos;llaymiz.{" "}
          <Link to="/map" className="font-semibold text-foreground underline-offset-2 hover:underline">
            Xaritaga qaytish
          </Link>
        </p>

        {VARIANT_ORDER.map((variant) => {
          const Card = SALON_PEEK_VARIANTS[variant];
          const label = SALON_PEEK_VARIANT_LABELS[variant];

          return (
            <section key={variant} className="space-y-3">
              <div>
                <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                  {label.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{label.subtitle}</p>
              </div>

              <div className="space-y-3 rounded-2xl bg-surface/50 p-3 ring-1 ring-border/40">
                {PREVIEW_SALONS.map((salon) => (
                  <Card key={`${variant}-${salon.id}`} salon={salon} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
