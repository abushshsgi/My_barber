export interface Salon {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  gallery: string[];
  rating: number;
  reviewCount: number;
  distance: number;
  lat: number;
  lng: number;
  city: string;
  address: string;
  phone: string;
  languages: string[];
  isPremium: boolean;
  workingDays: string[];
  workingHours: { open: string; close: string };
  barbers: Barber[];
  services: Service[];
  reviews: Review[];
}

export interface Barber {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  experience: number;
  specialties: string[];
  salonId: string;
  isOwner: boolean;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  salonId: string;
}

export interface Booking {
  id: string;
  salonId: string;
  salonName: string;
  barberId: string;
  barberName: string;
  services: { name: string; price: number; duration: number }[];
  totalPrice: number;
  totalDuration: number;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  photo?: string;
  createdAt: string;
  salonId: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  bookings: Booking[];
  reviews: Review[];
}

export interface Notification {
  id: string;
  type: 'reminder' | 'confirmed' | 'review_request' | 'invitation' | 'approval';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface BarberApplication {
  id: string;
  name: string;
  age: number;
  phone: string;
  email: string;
  shopName: string;
  city: string;
  lat: number;
  lng: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  bookingCount: number;
  lastVisit: string;
  totalSpent: number;
}
