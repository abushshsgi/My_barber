import { apiJson } from "./client";

export type ReferralInvitee = {
  id: number;
  full_name: string;
  phone_masked: string | null;
  avatar_url: string | null;
  joined_at: string | null;
  badge?: string | null;
};

export type ReferralInfo = {
  code: string;
  invite_url: string;
  invite_count: number;
  invites?: ReferralInvitee[];
  referral_generation_enabled?: boolean;
  referral_credits?: number;
  credit_per_invite?: number;
};

export async function fetchMyReferral(): Promise<ReferralInfo> {
  return apiJson<ReferralInfo>("/api/v1/users/me/referral/");
}
