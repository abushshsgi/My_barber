// Typed mock data for mysaloon.uz UI. UI-only — no backend.

export type Category = "barber" | "beauty" | "nails" | "spa";
export type Audience = "men" | "women" | "unisex";

export interface Service {
  id: string;
  name: string;
  duration: number; // minutes
  price: number; // UZS
}

export interface Barber {
  id: string;
  name: string;
  role: string;
  rating: number;
  avatarSeed: string;
  avatarUrl?: string;
  serviceIds: string[];
  independent?: boolean;
  salonId?: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface Salon {
  id: string;
  name: string;
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
}

export interface BookingItem {
  id: string;
  salonId: string;
  salonName: string;
  barberName: string;
  serviceName: string;
  date: string; // ISO
  duration: number;
  price: number;
  status: "pending" | "accepted" | "done" | "cancelled";
  coverSeed: string;
}

export interface ChatThread {
  id: string;
  salonName: string;
  barberName: string;
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

const services: Service[] = [
  { id: "s1", name: "Klassik soch turmagi", duration: 45, price: 120000 },
  { id: "s2", name: "Soqol dizayni", duration: 30, price: 80000 },
  { id: "s3", name: "Soch yuvish + styling", duration: 25, price: 65000 },
  { id: "s4", name: "Bolalar sochi", duration: 30, price: 70000 },
  { id: "s5", name: "Manikyur", duration: 60, price: 150000 },
  { id: "s6", name: "Yuz tozalash", duration: 50, price: 200000 },
];

const reviews: Review[] = [
  { id: "r1", author: "Sardor", rating: 5, text: "Juda yaxshi xizmat, rahmat!", date: "2 kun" },
  { id: "r2", author: "Dilshod", rating: 5, text: "Doim shu yerga keyaman.", date: "1 hafta" },
  { id: "r3", author: "Mirzo", rating: 4, text: "Yaxshi, lekin biroz kutdim.", date: "2 hafta" },
];

const barbers = (salonId: string): Barber[] => [
  { id: `${salonId}-b1`, name: "Jasur K.", role: "Senior Barber", rating: 4.9, avatarSeed: "jasur", serviceIds: ["s1", "s2", "s3"], salonId },
  { id: `${salonId}-b2`, name: "Malika A.", role: "Stylist", rating: 4.8, avatarSeed: "malika", serviceIds: ["s1", "s3", "s5"], salonId },
  { id: `${salonId}-b3`, name: "Timur V.", role: "Barber", rating: 4.7, avatarSeed: "timur", serviceIds: ["s1", "s2", "s4"], salonId },
];

export const salons: Salon[] = [
  {
    id: "1",
    name: "Legacy Barbershop",
    category: "barber",
    audience: "men",
    rating: 4.9,
    reviewCount: 248,
    address: "Amir Temur ko'chasi, 22",
    distanceKm: 1.2,
    priceFrom: 70000,
    priceTo: 250000,
    coverSeed: "legacy",
    about: "Klassik barber uslubidagi premium salon. Yetuk ustalar, qulay muhit.",
    services,
    staff: barbers("1"),
    reviews,
    portfolio: ["p1", "p2", "p3", "p4", "p5", "p6"],
    lat: 41.3111,
    lng: 69.2797,
  },
  {
    id: "2",
    name: "Atelier Beauty",
    category: "beauty",
    audience: "women",
    rating: 4.8,
    reviewCount: 187,
    address: "Mustaqillik ko'chasi, 15",
    distanceKm: 2.4,
    priceFrom: 90000,
    priceTo: 400000,
    coverSeed: "atelier",
    about: "Zamonaviy go'zallik saloni. Soch, yuz va parvarish xizmatlari.",
    services,
    staff: barbers("2"),
    reviews,
    portfolio: ["p1", "p2", "p3"],
    lat: 41.3201,
    lng: 69.2401,
  },
  {
    id: "3",
    name: "Studio M",
    category: "barber",
    audience: "men",
    rating: 4.7,
    reviewCount: 132,
    address: "Shahriston, 8",
    distanceKm: 3.1,
    priceFrom: 60000,
    priceTo: 180000,
    coverSeed: "studiom",
    about: "Mahallaga yaqin barbershop. Tezkor va sifatli.",
    services,
    staff: barbers("3"),
    reviews,
    portfolio: ["p1", "p2"],
    lat: 41.2995,
    lng: 69.2885,
  },
  {
    id: "4",
    name: "Nail House",
    category: "nails",
    audience: "women",
    rating: 4.9,
    reviewCount: 94,
    address: "Yunusobod, 4",
    distanceKm: 4.0,
    priceFrom: 80000,
    priceTo: 350000,
    coverSeed: "nailhouse",
    about: "Manikyur va pedikyur uchun mutaxassis salon.",
    services,
    staff: barbers("4"),
    reviews,
    portfolio: ["p1", "p2", "p3", "p4"],
    lat: 41.3477,
    lng: 69.2879,
  },
  {
    id: "5",
    name: "Noir Studio",
    category: "beauty",
    audience: "unisex",
    rating: 4.8,
    reviewCount: 156,
    address: "Chilonzor, 12",
    distanceKm: 2.0,
    priceFrom: 80000,
    priceTo: 320000,
    coverSeed: "noir",
    about: "Erkak va ayollar uchun zamonaviy uslubiy salon.",
    services,
    staff: barbers("5"),
    reviews,
    portfolio: ["p1", "p2", "p3"],
    lat: 41.2755,
    lng: 69.2030,
  },
  {
    id: "6",
    name: "Glow Spa",
    category: "spa",
    audience: "women",
    rating: 4.9,
    reviewCount: 78,
    address: "Mirzo Ulug'bek, 33",
    distanceKm: 5.2,
    priceFrom: 150000,
    priceTo: 600000,
    coverSeed: "glow",
    about: "Premium spa va parvarish markazi.",
    services,
    staff: barbers("6"),
    reviews,
    portfolio: ["p1", "p2"],
    lat: 41.3300,
    lng: 69.3400,
  },
];

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

export const chatThreads: ChatThread[] = [
  {
    id: "c1",
    salonName: "Legacy Barbershop",
    barberName: "Jasur K.",
    avatarSeed: "jasur",
    lastMessage: "Albatta, ertaga kutamiz!",
    lastTime: "12:34",
    unread: 2,
  },
  {
    id: "c2",
    salonName: "Atelier Beauty",
    barberName: "Malika A.",
    avatarSeed: "malika",
    lastMessage: "Vaqt sizga qulay bo'ladimi?",
    lastTime: "yest.",
    unread: 0,
  },
];

export const chatMessages: Record<string, ChatMessage[]> = {
  c1: [
    { id: "m1", fromMe: false, text: "Buyurtmangizni qabul qildim.", time: "12:30" },
    { id: "m2", fromMe: true, text: "Rahmat! Ertaga 10:00 ga to'g'rimi?", time: "12:32" },
    { id: "m3", fromMe: false, text: "Albatta, ertaga kutamiz!", time: "12:34" },
  ],
  c2: [
    { id: "m1", fromMe: false, text: "Vaqt sizga qulay bo'ladimi?", time: "yest." },
  ],
};

export const notifications: Notification[] = [
  {
    id: "n1",
    type: "booking",
    title: "Buyurtma tasdiqlandi",
    body: "Legacy Barbershop sizning buyurtmangizni qabul qildi.",
    time: "5 daq",
    read: false,
    bookingId: "bk1",
  },
  {
    id: "n2",
    type: "chat_message",
    title: "Yangi xabar — Jasur K.",
    body: "Albatta, ertaga kutamiz!",
    time: "1 soat",
    read: false,
    chatId: "c1",
  },
  {
    id: "n3",
    type: "promo",
    title: "−20% Atelier Beauty",
    body: "Hafta oxirigacha manikyur va styling chegirma.",
    time: "3 soat",
    read: false,
    link: "/offers",
  },
  {
    id: "n4",
    type: "review",
    title: "Sharhga javob",
    body: "Atelier Beauty sizning sharhingizga javob berdi.",
    time: "2 kun",
    read: true,
    reviewId: "ur2",
  },
];

export const offers: Offer[] = [
  { id: "of1", salonId: "1", salonName: "Legacy Barbershop", title: "Soch + soqol kombo", discountPct: 25, validUntil: "31.12", audience: "men" },
  { id: "of2", salonId: "2", salonName: "Atelier Beauty", title: "Manikyur + dizayn", discountPct: 20, validUntil: "30.11", audience: "women" },
  { id: "of3", salonId: "5", salonName: "Noir Studio", title: "Birinchi tashrif", discountPct: 15, validUntil: "15.12", audience: "unisex" },
  { id: "of4", salonId: "6", salonName: "Glow Spa", title: "Yuz tozalash paketi", discountPct: 30, validUntil: "20.12", audience: "women" },
];

export const trendingStyles: TrendingStyle[] = [
  { id: "men-mid-fade", title: "Mid Fade", audience: "men", category: "barber", seed: "mid-fade" },
  { id: "women-soft-bob", title: "Soft Bob", audience: "women", category: "beauty", seed: "soft-bob" },
  { id: "men-buzz-cut", title: "Buzz Cut", audience: "men", category: "barber", seed: "buzz-cut" },
  { id: "women-balayage", title: "Balayage", audience: "women", category: "beauty", seed: "balayage" },
  { id: "men-textured-crop", title: "Textured Crop", audience: "men", category: "barber", seed: "textured-crop" },
  { id: "women-pixie-cut", title: "Pixie Cut", audience: "women", category: "beauty", seed: "pixie-cut" },
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

export const formatPrice = (uzs: number): string =>
  new Intl.NumberFormat("uz-UZ").format(uzs) + " UZS";

export const shortPrice = (uzs: number): string => {
  if (uzs >= 1000) return `${Math.round(uzs / 1000)}k`;
  return String(uzs);
};
