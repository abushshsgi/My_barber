/** Demo salon/trend rasmlari (Unsplash, barqaror URL). */

const SALON_COVERS: Record<string, string> = {
  legacy:
    "https://images.unsplash.com/photo-1585747860715-2ba37e788f70?auto=format&fit=crop&w=800&h=600&q=80",
  atelier:
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&h=600&q=80",
  studiom:
    "https://images.unsplash.com/photo-1503957904860-b89353870476?auto=format&fit=crop&w=800&h=600&q=80",
  nailhouse:
    "https://images.unsplash.com/photo-1604654894617-8170df178cd9?auto=format&fit=crop&w=800&h=600&q=80",
  noir:
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&h=600&q=80",
  glow:
    "https://images.unsplash.com/photo-1540555700478-4be289fbe638?auto=format&fit=crop&w=800&h=600&q=80",
};

const TREND_COVERS: Record<string, string> = {
  tr1: "https://images.unsplash.com/photo-1622287163692-834b1f829c9e?auto=format&fit=crop&w=560&h=740&q=80",
  tr2: "https://images.unsplash.com/photo-1522337360788-8faa13fd3ef7?auto=format&fit=crop&w=560&h=740&q=80",
  tr3: "https://images.unsplash.com/photo-1599356854054-f03d66e2e884?auto=format&fit=crop&w=560&h=740&q=80",
  tr4: "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=560&h=740&q=80",
  tr5: "https://images.unsplash.com/photo-1605497788041-7a4e6300984e?auto=format&fit=crop&w=560&h=740&q=80",
  tr6: "https://images.unsplash.com/photo-1632345031435-8727f6897c53?auto=format&fit=crop&w=560&h=740&q=80",
};

export function getSalonCoverUrl(seed: string): string {
  return SALON_COVERS[seed] ?? SALON_COVERS.legacy;
}

export function getTrendCoverUrl(seed: string): string {
  return TREND_COVERS[seed] ?? TREND_COVERS.tr1;
}
