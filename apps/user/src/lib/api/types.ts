export type ApiUser = {
  id: number;
  email: string;
  phone: string | null;
  full_name: string;
  role: string;
  region: string;
  birth_year: number | null;
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
};

export type PhoneSendCodeResponse = {
  detail: string;
  phone: string;
  /** SMS ulanmaguncha — kod shu yerda keladi (keyin olib tashlanadi). */
  debug_code?: string;
  delivery?: "sms" | "app";
  /** Keyingi kod so'rashdan oldin kutish (soniya). */
  resend_after?: number;
};

export type ApiSalonList = {
  id: number;
  name: string;
  slug: string;
  cover_image: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  address: string;
  premium: boolean;
  is_published: boolean;
  rating_avg: number;
  review_count: number;
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
  created_at: string;
};

export type ApiService = {
  id: number;
  barber: number | null;
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
  salon: number | null;
  salon_name: string | null;
  barber: number;
  barber_name: string;
  start_at: string;
  end_at: string;
  started_at: string | null;
  status: string;
  total_price: number;
  lines: ApiBookingLine[];
  has_review: boolean;
  review_id: number | null;
  created_at: string;
};

export type ApiReview = {
  id: number;
  booking?: number;
  author_name: string;
  rating: number;
  text: string;
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

export type ApiBarberPublic = {
  id: number;
  barber_id: number;
  name: string;
  avatar: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
  services?: ApiBarberService[];
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
