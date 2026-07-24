export type ApiUser = {
  id: number;
  email: string;
  display_email: string | null;
  email_verified: boolean;
  phone: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  region: string;
  birth_year: number | null;
  age: number | null;
  latitude: string | number | null;
  longitude: string | number | null;
  onboarding_completed: boolean;
  avatar: string | null;
  has_password?: boolean;
  date_joined: string;
};

export type PhoneCheckResponse = {
  phone: string;
  has_password: boolean;
  registered: boolean;
};

export type PhoneVerifyResponse = {
  access: string;
  refresh: string;
  user: ApiUser;
  is_new_user: boolean;
  session_id?: number;
};

export type PhoneAuthIntent = "login" | "register";

export type PhoneSendCodeResponse = {
  detail: string;
  phone: string;
  registered?: boolean;
  /** SMS ulanmaguncha — kod shu yerda keladi (keyin olib tashlanadi). */
  debug_code?: string;
  delivery?: "sms" | "telegram" | "app";
  /** Keyingi kod so'rashdan oldin kutish (soniya). */
  resend_after?: number;
};

export type ApiSalonList = {
  id: number;
  name: string;
  slug: string;
  cover_image: string | null;
  /** Gallery rasmlari (list/nearby — karusel uchun). */
  images?: { id: number; image: string; sort_order: number }[];
  owner_id?: number | null;
  latitude: string | number | null;
  longitude: string | number | null;
  address: string;
  business_kind?: "barbershop" | "beauty_salon" | "";
  premium: boolean;
  is_published: boolean;
  rating_avg: number;
  review_count: number;
  price_from?: number;
  amenities?: ApiSalonAmenity[];
  venue_kind?: "solo_studio" | "salon";
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

export type ApiSalonAmenity = {
  code: string;
  icon: string;
  label: string;
};

export type ApiSalonRatingSummary = {
  rating_avg: number;
  review_count: number;
  is_guest_favorite: boolean;
  distribution: Record<string, number>;
  highlights: { code: string; label: string; score: number; count: number }[];
};

export type ApiAvailabilityMonthDay = {
  date: string;
  available: boolean;
  slot_count?: number;
};

export type ApiAvailabilityMonth = {
  year: number;
  month: number;
  days: ApiAvailabilityMonthDay[];
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

export type ApiSalonStaff = {
  id: number;
  full_name: string;
  avatar: string | null;
  role: string;
  experience_years: number;
  is_bookable?: boolean;
  gender?: "male" | "female" | "";
};

export type ApiNearbySalon = {
  salon: ApiSalonList;
  distance_km: number;
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
  customer_avatar: string;
  family_member: number | null;
  booked_for_name: string;
  salon: number | null;
  salon_name: string | null;
  barber: number;
  barber_name: string;
  start_at: string;
  end_at: string;
  started_at: string | null;
  checked_in_at?: string | null;
  status: string;
  total_price: number;
  payment_method?: string;
  payment_status?: string;
  paid_at?: string | null;
  portfolio_consent?: boolean | null;
  portfolio_allowed?: boolean;
  result_image_url?: string | null;
  order_number?: string | null;
  check_in_code?: string | null;
  check_in_short_code?: string | null;
  status_history?: Array<{ key: string; label: string; at: string }>;
  salon_address?: string | null;
  salon_latitude?: number | null;
  salon_longitude?: number | null;
  lines: ApiBookingLine[];
  has_review: boolean;
  review_id: number | null;
  created_at: string;
  booking_client_impressions?: string[];
};

export type ApiReview = {
  id: number;
  booking?: number;
  author_name: string;
  salon_name?: string;
  barber_name?: string;
  service_name?: string;
  rating: number;
  salon_rating?: number | null;
  text: string;
  salon_text?: string;
  photo: string | null;
  barber_reply: string;
  barber_replied_at: string | null;
  created_at: string;
};

export type ApiFavoriteRow = {
  id: number;
  salon: number;
  created_at: string;
};

export type ApiFavoritesList = {
  count: number;
  results: ApiFavoriteRow[];
};

export type ApiNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type ApiChatOther = {
  kind: "BARBER" | "USER";
  id: number;
  full_name: string;
  avatar: string;
};

export type ApiConversation = {
  id: string;
  last_message_text: string;
  last_message_at: string | null;
  updated_at: string;
  other: ApiChatOther;
  salon_name: string;
  unread_count: number;
};

export type ApiMessage = {
  id: number;
  sender_kind: "USER" | "BARBER";
  text: string;
  created_at: string;
};

export type ApiAvailabilitySlot = {
  start: string;
  end: string;
};

export type ApiBarberService = {
  id: number;
  name: string;
  price: number;
  duration_minutes: number;
  image_url?: string;
};

export type ApiAmenityChip = {
  code: string;
  icon: string;
  label: string;
};

export type ApiBarberPublic = {
  id: number;
  barber_id: number;
  name: string;
  phone?: string | null;
  region?: string;
  location_text?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  avatar: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
  services?: ApiBarberService[];
  active_services?: ApiBarberService[];
  work_photos?: { id: number; image: string; title?: string }[];
  booking_kind?: "salon" | "independent";
  salon_id?: number | null;
  salon_name?: string | null;
  amenities?: ApiAmenityChip[];
  work_location?: { code: string; label: string } | null;
  payment_methods?: { code: string; label: string }[];
  work_mode?: string;
  distance_km?: number;
  gender?: "male" | "female" | "";
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
