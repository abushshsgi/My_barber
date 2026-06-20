import { apiJson } from "./client";

export type ApiFamilyMember = {
  id: number;
  name: string;
  relation: "spouse" | "child" | "parent" | "sibling" | "other";
  relation_label: string;
  audience: "men" | "women" | "unisex";
  audience_label: string;
  phone: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type FamilyMemberPayload = {
  name: string;
  relation?: ApiFamilyMember["relation"];
  audience?: ApiFamilyMember["audience"];
  phone?: string;
  sort_order?: number;
};

export async function fetchFamilyMembers(): Promise<ApiFamilyMember[]> {
  return apiJson<ApiFamilyMember[]>("/api/v1/users/family/");
}

export async function createFamilyMember(data: FamilyMemberPayload): Promise<ApiFamilyMember> {
  return apiJson<ApiFamilyMember>("/api/v1/users/family/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFamilyMember(
  id: number,
  data: Partial<FamilyMemberPayload>,
): Promise<ApiFamilyMember> {
  return apiJson<ApiFamilyMember>(`/api/v1/users/family/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteFamilyMember(id: number): Promise<void> {
  await apiJson<void>(`/api/v1/users/family/${id}/`, { method: "DELETE" });
}
