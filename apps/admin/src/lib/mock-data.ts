// Mock data layer — barcha admin panel ma'lumotlari
export const REGIONS = [
  { code: "tashkent", name: "Toshkent" },
  { code: "samarkand", name: "Samarqand" },
  { code: "bukhara", name: "Buxoro" },
  { code: "fergana", name: "Farg'ona" },
  { code: "namangan", name: "Namangan" },
] as const;

export type RegionCode = (typeof REGIONS)[number]["code"];

export type AdminUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  region: RegionCode;
  is_active: boolean;
  created_at: string;
  bookings_count: number;
};

export type AdminBarber = {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  region: RegionCode;
  salon_id: string | null;
  salon_name: string | null;
  rating: number;
  reviews_count: number;
  is_active: boolean;
  lat: number;
  lng: number;
  created_at: string;
};

export type AdminSalon = {
  id: string;
  name: string;
  address: string;
  region: RegionCode;
  published: boolean;
  barbers_count: number;
  rating: number;
  lat: number;
  lng: number;
  created_at: string;
};

export type BookingStatus = "pending" | "confirmed" | "in_chair" | "completed" | "cancelled";

export type AdminBooking = {
  id: string;
  client_name: string;
  client_avatar: string;
  barber_name: string;
  salon_name: string;
  service: string;
  price: number;
  start_at: string;
  status: BookingStatus;
  region: RegionCode;
};

export type AdminReview = {
  id: string;
  client_name: string;
  barber_id: string;
  barber_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

// O'zbekiston shaharlari koordinatalari (markaziy nuqta)
const REGION_COORDS: Record<RegionCode, [number, number]> = {
  tashkent: [41.2995, 69.2401],
  samarkand: [39.6542, 66.9597],
  bukhara: [39.7747, 64.4286],
  fergana: [40.3894, 71.7831],
  namangan: [40.9983, 71.6726],
};

const FIRST_NAMES = [
  "Aziz",
  "Bekzod",
  "Doniyor",
  "Eldor",
  "Farrux",
  "G'ayrat",
  "Husan",
  "Ibrohim",
  "Jahongir",
  "Kamron",
  "Lazizbek",
  "Mansur",
  "Nodir",
  "Otabek",
  "Pulat",
  "Rustam",
  "Sardor",
  "Temur",
  "Umid",
  "Vohid",
  "Yusuf",
  "Zafar",
  "Akmal",
  "Botir",
  "Dilshod",
];

const LAST_NAMES = [
  "Karimov",
  "Yusupov",
  "Tursunov",
  "Nazarov",
  "Salimov",
  "Rahimov",
  "Aliyev",
  "Mirzayev",
  "Xolmatov",
  "Eshonqulov",
  "Ismoilov",
  "Saidov",
  "Qodirov",
  "Mahmudov",
];

const SALON_NAMES = [
  "Premium Cuts",
  "The Den Grooming",
  "Fade Society",
  "Proper & Co.",
  "Ironwood Barbers",
  "Sharp Studio",
  "Royal Razor",
  "Urban Style",
  "Classic Cut Co.",
  "Master Barber",
  "Gold Comb",
  "Silver Scissors",
  "The Gentleman",
  "Old School Barber",
  "New Wave Cuts",
  "Legacy Grooming",
  "Elite Hair",
  "Vintage Barber Shop",
  "Modern Man",
  "City Cuts",
  "Crown & Comb",
  "The Lounge",
  "Bespoke Barber",
  "Atelier Hair",
  "Studio One",
];

const SERVICES = [
  "Klassik soch olish",
  "Soqol olish",
  "Skin fade",
  "Buzz cut",
  "Issiq sochiq + soqol",
  "Bola soch olish",
  "Premium grooming",
];

const REVIEW_COMMENTS = [
  "Ajoyib xizmat, yana keladi!",
  "Juda professional, rahmat.",
  "Yaxshi, lekin biroz kutdim.",
  "Eng yaxshi sartarosh shaharda.",
  "Tavsiya qilaman.",
  "Narxi arzon, sifat zo'r.",
  "Vaqtni aniq belgilab oldi.",
  "Yana boraman.",
  "Yoqdi, lekin yaxshilanish kerak.",
  "Mukammal natija!",
];

function rand<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

function jitter(base: number, seed: number, range: number): number {
  return base + (Math.sin(seed * 13.7) * range - range / 2);
}

function fullName(i: number): string {
  return `${rand(FIRST_NAMES, i)} ${rand(LAST_NAMES, i + 3)}`;
}

function avatar(i: number): string {
  return `https://i.pravatar.cc/150?img=${(i % 70) + 1}`;
}

function isoOffset(daysAgo: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, (daysAgo * 7) % 60, 0, 0);
  return d.toISOString();
}

// --- Generate ---

const regionCodes = REGIONS.map((r) => r.code);

export const mockSalons: AdminSalon[] = Array.from({ length: 25 }, (_, i) => {
  const region = regionCodes[i % regionCodes.length];
  const [baseLat, baseLng] = REGION_COORDS[region];
  return {
    id: `salon-${i + 1}`,
    name: SALON_NAMES[i],
    address: `${rand(["Amir Temur", "Mustaqillik", "Navoiy", "Shota Rustaveli"], i)} ko'chasi, ${i + 5}`,
    region,
    published: i % 5 !== 0,
    barbers_count: 2 + (i % 6),
    rating: 4.0 + ((i * 7) % 10) / 10,
    lat: jitter(baseLat, i, 0.08),
    lng: jitter(baseLng, i + 1, 0.08),
    created_at: isoOffset(i * 4),
  };
});

export const mockBarbers: AdminBarber[] = Array.from({ length: 40 }, (_, i) => {
  const region = regionCodes[i % regionCodes.length];
  const [baseLat, baseLng] = REGION_COORDS[region];
  const salon = mockSalons[i % mockSalons.length];
  return {
    id: `barber-${i + 1}`,
    name: fullName(i),
    avatar: avatar(i),
    phone: `+998 9${(i % 9) + 1} ${100 + i}-${10 + (i % 89)}-${10 + ((i * 3) % 89)}`,
    region,
    salon_id: i % 7 === 0 ? null : salon.id,
    salon_name: i % 7 === 0 ? null : salon.name,
    rating: 4.0 + ((i * 11) % 10) / 10,
    reviews_count: 12 + ((i * 3) % 200),
    is_active: i % 11 !== 0,
    lat: jitter(baseLat, i + 100, 0.1),
    lng: jitter(baseLng, i + 200, 0.1),
    created_at: isoOffset(i * 3),
  };
});

export const mockUsers: AdminUser[] = Array.from({ length: 50 }, (_, i) => {
  const region = regionCodes[i % regionCodes.length];
  return {
    id: `user-${i + 1}`,
    name: fullName(i + 50),
    phone: `+998 9${(i % 9) + 1} ${200 + i}-${20 + (i % 79)}-${15 + ((i * 5) % 84)}`,
    email: `user${i + 1}@mail.uz`,
    region,
    is_active: i % 9 !== 0,
    created_at: isoOffset(i * 2),
    bookings_count: (i * 3) % 24,
  };
});

const STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "in_chair",
  "completed",
  "completed",
  "completed",
  "cancelled",
];

export const mockBookings: AdminBooking[] = Array.from({ length: 60 }, (_, i) => {
  const barber = mockBarbers[i % mockBarbers.length];
  const user = mockUsers[i % mockUsers.length];
  return {
    id: `bk-${9000 + i}`,
    client_name: user.name,
    client_avatar: avatar(i + 30),
    barber_name: barber.name,
    salon_name: barber.salon_name ?? "Mustaqil sartarosh",
    service: rand(SERVICES, i),
    price: 50000 + (i % 8) * 25000,
    start_at: isoOffset(Math.floor(i / 6), 9 + (i % 10)),
    status: STATUSES[i % STATUSES.length],
    region: barber.region,
  };
});

export const mockReviews: AdminReview[] = Array.from({ length: 35 }, (_, i) => {
  const barber = mockBarbers[i % mockBarbers.length];
  return {
    id: `rv-${i + 1}`,
    client_name: fullName(i + 100),
    barber_id: barber.id,
    barber_name: barber.name,
    rating: 3 + (i % 3),
    comment: rand(REVIEW_COMMENTS, i),
    created_at: isoOffset(i),
  };
});

// Stats
export type AdminStats = {
  total_users: number;
  total_barbers: number;
  total_salons: number;
  total_bookings: number;
  weekly_bookings: number;
  revenue_uzs: number;
  delta: { users: number; barbers: number; bookings: number; revenue: number };
  regions: Array<{
    code: RegionCode;
    name: string;
    barbers: number;
    salons: number;
    users: number;
    bookings: number;
  }>;
};

export const mockStats: AdminStats = {
  total_users: mockUsers.length,
  total_barbers: mockBarbers.length,
  total_salons: mockSalons.length,
  total_bookings: mockBookings.length,
  weekly_bookings: 14250,
  revenue_uzs: 528_400_000,
  delta: { users: 4.2, barbers: 1.8, bookings: 8.1, revenue: -1.2 },
  regions: REGIONS.map((r) => ({
    code: r.code,
    name: r.name,
    barbers: mockBarbers.filter((b) => b.region === r.code).length,
    salons: mockSalons.filter((s) => s.region === r.code).length,
    users: mockUsers.filter((u) => u.region === r.code).length,
    bookings: mockBookings.filter((b) => b.region === r.code).length,
  })),
};
