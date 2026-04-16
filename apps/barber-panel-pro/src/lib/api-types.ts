export type BookingStatusApi = "pending" | "accepted" | "in_progress" | "completed" | "rejected";

export type BookingLineApi = {
  id: number;
  service: number | null;
  barber_service: number | null;
  service_name: string;
  price: string;
  duration_minutes: number;
};

export type BookingApi = {
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
  started_at: string | null;
  status: BookingStatusApi;
  total_price: string;
  lines: BookingLineApi[];
  created_at: string;
};

export type NotificationApi = {
  id: number;
  kind: string;
  title: string;
  body: string;
  payload: unknown;
  created_at: string;
  read_at: string | null;
};

export type BarberMeApi = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: "BARBER";
  work_mode: string;
};

export type BarberProfileApi =
  | { exists: false }
  | { exists: true; id: number; location_text: string; latitude: string | null; longitude: string | null };

export type IndependentClientApi = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  completed_bookings: number;
  total_spent: string;
  classification: "new" | "returning";
};

export type ConversationListItemApi = {
  id: string; // public_id UUID
  user_id: number;
  user_name: string;
  barber_id: number;
  barber_name: string;
  last_message_text: string | null;
  last_message_at: string | null;
  updated_at: string;
};

export type MessageApi = {
  id: number;
  sender_kind: "USER" | "BARBER";
  text: string;
  created_at: string;
};

export type PaginatedMessagesApi = {
  count: number;
  next: string | null;
  previous: string | null;
  results: MessageApi[];
};

