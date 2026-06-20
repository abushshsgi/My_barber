import { apiJson } from "./client";

export type ApiUserAddress = {
  id: number;
  label: "home" | "work" | "other";
  custom_label: string;
  display_label: string;
  address_line: string;
  region: string;
  latitude: string | number | null;
  longitude: string | number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type UserAddressPayload = {
  label?: ApiUserAddress["label"];
  custom_label?: string;
  address_line: string;
  region: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
};

export async function fetchUserAddresses(): Promise<ApiUserAddress[]> {
  return apiJson<ApiUserAddress[]>("/api/v1/users/addresses/");
}

export async function createUserAddress(data: UserAddressPayload): Promise<ApiUserAddress> {
  return apiJson<ApiUserAddress>("/api/v1/users/addresses/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateUserAddress(
  id: number,
  data: Partial<UserAddressPayload>,
): Promise<ApiUserAddress> {
  return apiJson<ApiUserAddress>(`/api/v1/users/addresses/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteUserAddress(id: number): Promise<void> {
  await apiJson<void>(`/api/v1/users/addresses/${id}/`, { method: "DELETE" });
}

export async function setDefaultUserAddress(id: number): Promise<ApiUserAddress> {
  return apiJson<ApiUserAddress>(`/api/v1/users/addresses/${id}/set-default/`, {
    method: "POST",
  });
}
