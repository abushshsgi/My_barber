export type ApiSalonList = {
  id: number;
  name: string;
  slug: string;
  cover_image: string | null;
  images?: { id: number; image: string; sort_order: number }[];
  latitude: string | number | null;
  longitude: string | number | null;
  address: string;
  business_kind?: "barbershop" | "beauty_salon" | "";
  premium: boolean;
  is_published?: boolean;
  rating_avg: number;
  review_count: number;
  price_from?: number;
  venue_kind?: "solo_studio" | "salon";
};

export type ApiNearbySalon = {
  salon: ApiSalonList;
  distance_km: number;
};

export type ApiBarberService = {
  id: number;
  name: string;
  price: number;
  duration_minutes?: number;
};

export type ApiBarberPublic = {
  id: number;
  barber_id: number;
  name: string;
  region?: string;
  location_text?: string;
  avatar: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
  services?: ApiBarberService[];
  active_services?: ApiBarberService[];
  work_photos?: { id: number; image: string; title?: string }[];
  salon_id?: number | null;
  salon_name?: string | null;
  distance_km?: number;
  gender?: "male" | "female" | "";
};

export type HomeCategoryKey = "all" | "barber" | "beauty" | "nails";

export type HomeListing = {
  id: string;
  title: string;
  coverUrl: string | null;
  categoryLabel: string;
  distanceKm: number;
  address: string;
  priceFrom: number;
  favoriteId?: string;
};
