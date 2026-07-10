export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  priceLabel?: string;
  coverUrl?: string;
  /** Preview karusel rasmlari (bo'sh bo'lsa coverUrl ishlatiladi). */
  imageUrls?: string[];
  address?: string;
  rating?: number;
  ctaLabel?: string;
};

export type MapCoords = {
  lat: number;
  lng: number;
};

export type AdminMapPoint = {
  id: string | number;
  lat: number;
  lng: number;
  label: string;
  subtitle?: string;
  kind: "salon" | "barber";
};
