export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  priceLabel?: string;
  coverUrl?: string;
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
