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

export type ApiSalonAmenity = {
  code: string;
  icon: string;
  label: string;
};

export type ApiService = {
  id: number;
  barber: number | null;
  barber_name?: string | null;
  catalog_service: number | null;
  name: string;
  price: number;
  duration_minutes: number;
  image_url?: string;
};

export type ApiAvailabilitySlot = {
  start: string;
  end: string;
};

export type ApiBookingLine = {
  id: number;
  service: number | null;
  barber_service: number | null;
  service_name: string;
  price: number;
  duration_minutes: number;
};

export type ApiBooking = {
  id: number;
  customer: number;
  customer_name: string;
  customer_phone: string;
  salon: number | null;
  salon_name: string | null;
  barber: number;
  barber_name: string;
  start_at: string;
  end_at: string;
  status: string;
  total_price: number;
  payment_method?: string;
  lines: ApiBookingLine[];
  order_number?: string | null;
  check_in_code?: string | null;
  created_at: string;
};

export type ApiSalonDetail = ApiSalonList & {
  owner_id: number | null;
  description: string;
  phone: string;
  languages: string[];
  closed_weekdays: number[];
  hours: { weekday: number; open_time: string; close_time: string }[];
  images: { id: number; image: string; sort_order: number }[];
  services: ApiService[];
  amenities: ApiSalonAmenity[];
  created_at: string;
};

export type ApiSalonStaff = {
  id: number;
  full_name: string;
  avatar: string | null;
  role: string;
  experience_years: number;
  is_bookable?: boolean;
  gender?: "male" | "female" | "";
};

export type SalonDetail = {
  id: string;
  name: string;
  categoryLabel: string;
  address: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  about: string;
  priceFrom: number;
  priceTo: number;
  coverUrl: string | null;
  portfolio: string[];
  services: {
    id: string;
    name: string;
    price: number;
    duration: number;
    barberName: string | null;
  }[];
  staff: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: string;
  }[];
  amenities: ApiSalonAmenity[];
  hours: { weekday: number; openTime: string; closeTime: string }[];
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
