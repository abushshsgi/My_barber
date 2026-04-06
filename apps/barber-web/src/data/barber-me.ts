import { apiFetch } from "@/lib/api";

export type BarberMe = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  work_mode: "salon" | "independent";
};

export async function fetchBarberMe(): Promise<BarberMe> {
  const res = await apiFetch("/api/v1/barber/auth/me/");
  if (!res.ok) throw new Error("Barber ma'lumotlari yuklanmadi");
  return res.json() as Promise<BarberMe>;
}
