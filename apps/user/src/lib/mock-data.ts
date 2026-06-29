// Typed mock data for mysaloon.uz UI. UI-only — no backend.

export type Category = "barber" | "beauty" | "nails" | "spa";
export type Audience = "men" | "women" | "unisex";

export interface Service {
  id: string;
  name: string;
  duration: number; // minutes
  price: number; // UZS
  barberId?: string | null;
  barberName?: string | null;
}

export interface Barber {
  id: string;
  name: string;
  role: string;
  rating: number;
  avatarSeed: string;
  avatarUrl?: string;
  serviceIds: string[];
  isBookable?: boolean;
  independent?: boolean;
  salonId?: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  photo?: string;
}

export interface SalonAmenity {
  code: string;
  icon: string;
  label: string;
}

export interface SalonHour {
  weekday: number;
  openTime: string;
  closeTime: string;
}

export interface SalonRatingSummary {
  ratingAvg: number;
  reviewCount: number;
  isGuestFavorite: boolean;
  distribution: Record<string, number>;
  highlights: { code: string; label: string; score: number; count: number }[];
}

export interface Salon {
  id: string;
  name: string;
  ownerId?: string;
  category: Category;
  audience: Audience;
  rating: number;
  reviewCount: number;
  address: string;
  distanceKm: number;
  priceFrom: number;
  priceTo: number;
  coverSeed: string;
  coverUrl?: string;
  about: string;
  services: Service[];
  staff: Barber[];
  reviews: Review[];
  portfolio: string[];
  lat: number;
  lng: number;
  amenities: SalonAmenity[];
  venueKind?: "solo_studio" | "salon";
  hours: SalonHour[];
  closedWeekdays: number[];
  ratingSummary: SalonRatingSummary | null;
}

export interface BookingItem {
  id: string;
  salonId: string;
  salonName: string;
  barberId: number;
  barberName: string;
  serviceName: string;
  date: string; // ISO start_at
  endAt?: string;
  startedAt?: string | null;
  duration: number;
  price: number;
  status: "pending" | "accepted" | "in_progress" | "done" | "cancelled";
  coverSeed: string;
  bookedForName?: string;
  hasReview?: boolean;
  reviewId?: string;
  lines?: Array<{ service_name: string; duration_minutes: number; price: number }>;
  salonAddress?: string;
  salonLatitude?: number;
  salonLongitude?: number;
  checkedInAt?: string;
  portfolioConsent?: boolean | null;
  portfolioAllowed?: boolean;
  resultImageUrl?: string;
  orderNumber?: string;
  checkInCode?: string;
  checkInShortCode?: string;
  statusHistory?: Array<{ key: string; label: string; at: string }>;
  paymentMethod?: "cash" | "online";
  paymentStatus?: string;
  paidAt?: string;
}

export interface ChatThread {
  id: string;
  salonName: string;
  barberName: string;
  barberId?: number;
  avatarSeed: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
}

export interface ChatMessage {
  id: string;
  fromMe: boolean;
  text: string;
  time: string;
}

export interface Notification {
  id: string;
  type: "booking" | "chat_message" | "review" | "promo";
  title: string;
  body: string;
  time: string;
  read: boolean;
  /** @deprecated use bookingId / chatId / reviewId for deep links */
  link?: string;
  bookingId?: string;
  chatId?: string;
  reviewId?: string;
}

export interface Offer {
  id: string;
  salonId: string;
  salonName: string;
  title: string;
  discountPct: number;
  validUntil: string;
  audience: Audience;
}

export interface TrendingStyle {
  id: string;
  title: string;
  audience: Audience;
  category: Category;
  seed: string;
}

export interface GiftCard {
  id: string;
  amount: number;
  label: string;
}

export interface UserReview {
  id: string;
  salonId: string;
  salonName: string;
  barberName: string;
  rating: number;
  text: string;
  date: string;
}

export interface PaymentMethod {
  id: string;
  type: "card" | "click" | "payme";
  label: string;
  detail: string;
  primary?: boolean;
}

export interface SavedAddress {
  id: string;
  label: string;
  line: string;
  district: string;
  isDefault?: boolean;
}

export interface FavoriteStylist {
  id: string;
  name: string;
  role: string;
  salonId: string;
  salonName: string;
  rating: number;
  avatarSeed: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceMonthly: number;
  visits: number;
  perks: string[];
  active?: boolean;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  audience: Audience;
  phone?: string;
}

export const bookings: BookingItem[] = [
  {
    id: "bk1",
    salonId: "1",
    salonName: "Legacy Barbershop",
    barberName: "Jasur K.",
    serviceName: "Klassik soch turmagi",
    date: new Date(Date.now() + 86400000).toISOString(),
    duration: 45,
    price: 120000,
    status: "accepted",
    coverSeed: "legacy",
  },
  {
    id: "bk2",
    salonId: "2",
    salonName: "Atelier Beauty",
    barberName: "Malika A.",
    serviceName: "Manikyur",
    date: new Date(Date.now() + 86400000 * 3).toISOString(),
    duration: 60,
    price: 150000,
    status: "pending",
    coverSeed: "atelier",
  },
  {
    id: "bk3",
    salonId: "1",
    salonName: "Legacy Barbershop",
    barberName: "Timur V.",
    serviceName: "Soqol dizayni",
    date: new Date(Date.now() - 86400000 * 7).toISOString(),
    duration: 30,
    price: 80000,
    status: "done",
    coverSeed: "legacy",
  },
];

export const trendingStyles: TrendingStyle[] = [
  { id: "men-mid-fade", title: "Mid Fade", audience: "men", category: "barber", seed: "mid-fade" },
  { id: "men-skin-fade", title: "Skin Fade", audience: "men", category: "barber", seed: "skin-fade" },
  { id: "men-buzz-cut", title: "Buzz Cut", audience: "men", category: "barber", seed: "buzz-cut" },
  { id: "men-textured-crop", title: "Textured Crop", audience: "men", category: "barber", seed: "textured-crop" },
];

export const giftCards: GiftCard[] = [
  { id: "g1", amount: 200000, label: "Mini" },
  { id: "g2", amount: 500000, label: "Standart" },
  { id: "g3", amount: 1000000, label: "Premium" },
];

export const loyaltyMock = {
  points: 1240,
  tier: "Silver",
  nextTier: "Gold",
  toNext: 760,
  perks: [
    "Har 10 ta tashrifdan keyin 1 ta bepul",
    "Sevimli salonlarda −10% chegirma",
    "Yangi xizmatlarga ertaroq kirish",
  ],
};

/** Demo hamyon balansi (wallet sahifasi bilan mos). */
export const walletSummary = {
  balance: 47000,
};

export const userProfile = {
  name: "Azizbek Karimov",
  phone: "+998 90 123 45 67",
  email: "aziz@example.com",
  avatarSeed: "azizbek",
  preferredAudience: "men" as Audience,
};

export const userReviews: UserReview[] = [
  {
    id: "ur1",
    salonId: "1",
    salonName: "Legacy Barbershop",
    barberName: "Timur V.",
    rating: 5,
    text: "Juda professional xizmat, vaqtida va sifatli.",
    date: "2026-01-12",
  },
  {
    id: "ur2",
    salonId: "2",
    salonName: "Atelier Beauty",
    barberName: "Malika A.",
    rating: 4,
    text: "Manikyur zo'r, faqat kutish biroz uzoq bo'ldi.",
    date: "2026-02-03",
  },
  {
    id: "ur3",
    salonId: "1",
    salonName: "Legacy Barbershop",
    barberName: "Jasur K.",
    rating: 5,
    text: "Fade ajoyib chiqdi, yana kelaman.",
    date: "2026-02-18",
  },
];

export const paymentMethods: PaymentMethod[] = [
  { id: "pm1", type: "card", label: "Uzcard", detail: "•••• 4821", primary: true },
  { id: "pm2", type: "click", label: "Click", detail: "+998 90 *** 45 67" },
  { id: "pm3", type: "payme", label: "Payme", detail: "Ulangan" },
];

export const savedAddresses: SavedAddress[] = [
  {
    id: "a1",
    label: "Uy",
    line: "Amir Temur ko'chasi, 22",
    district: "Yunusobod",
    isDefault: true,
  },
  {
    id: "a2",
    label: "Ofis",
    line: "Mustaqillik ko'chasi, 15",
    district: "Mirzo Ulug'bek",
  },
];

export const favoriteStylists: FavoriteStylist[] = [
  {
    id: "fs1",
    name: "Jasur K.",
    role: "Barber",
    salonId: "1",
    salonName: "Legacy Barbershop",
    rating: 4.9,
    avatarSeed: "jasur",
  },
  {
    id: "fs2",
    name: "Malika A.",
    role: "Stylist",
    salonId: "2",
    salonName: "Atelier Beauty",
    rating: 4.8,
    avatarSeed: "malika",
  },
  {
    id: "fs3",
    name: "Timur V.",
    role: "Barber",
    salonId: "1",
    salonName: "Legacy Barbershop",
    rating: 4.7,
    avatarSeed: "timur",
  },
];

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "sub1",
    name: "Barber Start",
    priceMonthly: 299000,
    visits: 2,
    perks: ["Soch + soqol", "Har oy 2 tashrif", "−5% qo'shimcha xizmat"],
  },
  {
    id: "sub2",
    name: "Premium Groom",
    priceMonthly: 499000,
    visits: 4,
    perks: ["Cheksiz styling maslahat", "Har oy 4 tashrif", "Ustun navbat"],
  },
  {
    id: "sub3",
    name: "Beauty Care",
    priceMonthly: 399000,
    visits: 3,
    perks: ["Manikyur + parvarish", "Har oy 3 tashrif", "Sovg'a mini to'plam"],
  },
];

/** Foydalanuvchi obunasi: null = obuna yo'q (Upgrade). */
export const userSubscriptionId: string | null = null;

export function getUserSubscription(): SubscriptionPlan | null {
  if (!userSubscriptionId) return null;
  return subscriptionPlans.find((p) => p.id === userSubscriptionId) ?? null;
}

export const familyMembers: FamilyMember[] = [
  { id: "f1", name: "Azizbek Karimov", relation: "O'zim", audience: "men", phone: "+998 90 123 45 67" },
  { id: "f2", name: "Dilnoza K.", relation: "Rafiqa", audience: "women" },
  { id: "f3", name: "Amir K.", relation: "O'g'il", audience: "men", phone: "+998 91 000 12 34" },
];

export { formatPrice, shortPrice } from "@/lib/price-display";
