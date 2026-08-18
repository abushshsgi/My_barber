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
};

export async function fetchUserAddresses(): Promise<ApiUserAddress[]> {
  return apiJson<ApiUserAddress[]>("/api/v1/users/addresses/");
}

export async function upsertDefaultAddress(data: {
  address_line: string;
  region: string;
  id?: number;
}): Promise<ApiUserAddress> {
  if (data.id) {
    return apiJson<ApiUserAddress>(`/api/v1/users/addresses/${data.id}/`, {
      method: "PATCH",
      body: JSON.stringify({
        address_line: data.address_line,
        region: data.region,
        is_default: true,
      }),
    });
  }
  return apiJson<ApiUserAddress>("/api/v1/users/addresses/", {
    method: "POST",
    body: JSON.stringify({
      label: "home",
      address_line: data.address_line,
      region: data.region,
      is_default: true,
    }),
  });
}
