export interface Booking {
  id: string;
  clientName: string;
  service: string;
  time: string;
  date: string;
  status: "accepted" | "in_progress" | "completed";
  price: number;
  startedAt?: number;
}

export interface Client {
  id: string;
  name: string;
  lastVisit: string;
  totalVisits: number;
  phone: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

export interface Salon {
  id: string;
  name: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  coverImage: string;
  images: string[];
}

export interface BarberService {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export const mockBookings: Booking[] = [
  { id: "1", clientName: "James Wilson", service: "Haircut + Beard", time: "09:00", date: "Today", status: "completed", price: 45 },
  { id: "2", clientName: "Marcus Chen", service: "Fade Cut", time: "10:30", date: "Today", status: "in_progress", price: 35, startedAt: Date.now() - 1200000 },
  { id: "3", clientName: "David Park", service: "Beard Trim", time: "12:00", date: "Today", status: "accepted", price: 20 },
  { id: "4", clientName: "Alex Rivera", service: "Full Service", time: "14:00", date: "Today", status: "accepted", price: 60 },
  { id: "5", clientName: "Tom Bradley", service: "Haircut", time: "15:30", date: "Today", status: "accepted", price: 30 },
];

export const mockClients: Client[] = [
  { id: "1", name: "James Wilson", lastVisit: "Today", totalVisits: 12, phone: "+1 555-0101" },
  { id: "2", name: "Marcus Chen", lastVisit: "Today", totalVisits: 8, phone: "+1 555-0102" },
  { id: "3", name: "David Park", lastVisit: "3 days ago", totalVisits: 5, phone: "+1 555-0103" },
  { id: "4", name: "Alex Rivera", lastVisit: "1 week ago", totalVisits: 15, phone: "+1 555-0104" },
  { id: "5", name: "Tom Bradley", lastVisit: "2 weeks ago", totalVisits: 3, phone: "+1 555-0105" },
];

export const mockReviews: Review[] = [
  { id: "1", author: "James Wilson", rating: 5, comment: "Best barber in town. Always consistent quality.", date: "2 days ago" },
  { id: "2", author: "Marcus Chen", rating: 5, comment: "Great fade, very precise. Highly recommend.", date: "1 week ago" },
  { id: "3", author: "David Park", rating: 4, comment: "Good service, nice atmosphere.", date: "2 weeks ago" },
  { id: "4", author: "Alex Rivera", rating: 5, comment: "Professional and friendly. My go-to barber.", date: "3 weeks ago" },
  { id: "5", author: "Tom Bradley", rating: 4, comment: "Solid haircut, fair price.", date: "1 month ago" },
];

export const mockMessages: Message[] = [
  { id: "1", sender: "James Wilson", text: "Hey, can I move my appointment to 3pm?", time: "09:15", isMe: false },
  { id: "2", sender: "Me", text: "Sure, 3pm works. See you then!", time: "09:18", isMe: true },
  { id: "3", sender: "James Wilson", text: "Thanks!", time: "09:19", isMe: false },
];

export const mockNotifications: Notification[] = [
  { id: "1", title: "New booking", description: "David Park booked a Beard Trim at 12:00", time: "5 min ago", read: false },
  { id: "2", title: "Review received", description: "James Wilson left a 5-star review", time: "2 hours ago", read: false },
  { id: "3", title: "Booking completed", description: "Session with James Wilson marked as complete", time: "3 hours ago", read: true },
  { id: "4", title: "New message", description: "Marcus Chen sent you a message", time: "Yesterday", read: true },
];

export const mockSalons: Salon[] = [
  {
    id: "1",
    name: "The Gentleman's Cut",
    address: "123 Main Street, Brooklyn, NY",
    phone: "+1 555-0200",
    rating: 4.8,
    reviewCount: 142,
    coverImage: "https://images.unsplash.com/photo-1585747860281-e1b4a3c0eb88?w=1200&h=400&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1587909209111-5097ee578ec3?w=400&h=400&fit=crop",
    ],
  },
];

export const mockServices: BarberService[] = [
  { id: "1", name: "Haircut", duration: 30, price: 30 },
  { id: "2", name: "Fade Cut", duration: 45, price: 35 },
  { id: "3", name: "Beard Trim", duration: 20, price: 20 },
  { id: "4", name: "Haircut + Beard", duration: 50, price: 45 },
  { id: "5", name: "Full Service", duration: 60, price: 60 },
];

export const mockWorkingHours = [
  { day: "Monday", from: "09:00", to: "18:00", enabled: true },
  { day: "Tuesday", from: "09:00", to: "18:00", enabled: true },
  { day: "Wednesday", from: "09:00", to: "18:00", enabled: true },
  { day: "Thursday", from: "09:00", to: "20:00", enabled: true },
  { day: "Friday", from: "09:00", to: "20:00", enabled: true },
  { day: "Saturday", from: "10:00", to: "16:00", enabled: true },
  { day: "Sunday", from: "", to: "", enabled: false },
];
