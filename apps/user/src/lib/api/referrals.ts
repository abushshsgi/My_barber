import { apiJson } from "./client";

export type ReferralInfo = {
  code: string;
  invite_url: string;
  invite_count: number;
};

export async function fetchMyReferral(): Promise<ReferralInfo> {
  return apiJson<ReferralInfo>("/api/v1/users/me/referral/");
}
