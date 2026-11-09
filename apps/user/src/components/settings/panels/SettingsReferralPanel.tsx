import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ProfileSubpageCard } from "@/components/profile/ProfileSubpageLayout";
import { SubscriptionVerifiedBadge } from "@/components/subscriptions/SubscriptionVerifiedBadge";
import { useMyReferral } from "@/hooks/use-referral";
import type { ReferralInvitee } from "@/lib/api/referrals";
import { resolveShareInviteUrl } from "@/lib/referral-storage";

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function InviteeRow({ invitee }: { invitee: ReferralInvitee }) {
  const joined = invitee.joined_at ? new Date(invitee.joined_at).toLocaleDateString("uz-UZ") : null;
  return (
    <li className="flex items-center gap-3 py-2.5">
      {invitee.avatar_url ? (
        <img
          src={invitee.avatar_url}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">
          {initials(invitee.full_name)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          <span className="truncate">{invitee.full_name}</span>
          <SubscriptionVerifiedBadge badge={invitee.badge} size="sm" />
          <Check
            className="size-3.5 shrink-0 text-foreground"
            strokeWidth={2.75}
            aria-label="Qo'shilgan"
          />
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {[invitee.phone_masked, joined].filter(Boolean).join(" · ")}
        </p>
      </div>
    </li>
  );
}

export function SettingsReferralPanel() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useMyReferral();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const inviteUrl = data ? resolveShareInviteUrl(data.code, data.invite_url) : "";
  const invites = data?.invites ?? [];
  const refGenOn = data?.referral_generation_enabled !== false;
  const credits = data?.referral_credits ?? 0;

  const handleCopy = async (value: string, which: "code" | "link") => {
    const ok = await copyText(value);
    if (!ok) {
      toast.error(t("referral.copyFailed", { defaultValue: "Nusxa olishning iloji bo'lmadi" }));
      return;
    }
    setCopied(which);
    toast.success(t("referral.copied", { defaultValue: "Nusxa olindi" }));
    window.setTimeout(() => setCopied((c) => (c === which ? null : c)), 1800);
  };

  const handleShare = async () => {
    if (!data || !inviteUrl) return;
    const message = t("referral.shareMessage", {
      code: data.code,
      defaultValue:
        "MySaloon'ga qo'shil — salonlarni top va onlayn bron qil! Mening kodim: {{code}}",
    });
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "MySaloon", text: message, url: inviteUrl });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    await handleCopy(inviteUrl, "link");
  };

  if (isLoading) {
    return (
      <ProfileSubpageCard>
        <p className="text-sm text-muted-foreground">
          {t("common.loading", { defaultValue: "Yuklanmoqda…" })}
        </p>
      </ProfileSubpageCard>
    );
  }

  if (isError || !data) {
    return (
      <ProfileSubpageCard>
        <p className="text-sm text-muted-foreground">
          {t("referral.loadError", { defaultValue: "Referal ma'lumotini yuklab bo'lmadi." })}
        </p>
      </ProfileSubpageCard>
    );
  }

  const usedCredits = refGenOn ? Math.max(0, data.invite_count - credits) : 0;

  return (
    <div className="space-y-3">
      <ProfileSubpageCard className="space-y-3">
        <p className="text-sm font-semibold leading-snug">
          {t("referral.offer", {
            defaultValue: "1 ta do'st taklif qiling — 1 ta try-on generatsiya bepul.",
          })}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Stat
            value={String(data.invite_count)}
            label={t("referral.statFriends", { defaultValue: "Do'stlar" })}
          />
          <Stat
            value={refGenOn ? String(credits) : "0"}
            label={t("referral.statCredits", { defaultValue: "Bepul" })}
          />
          <Stat
            value={String(usedCredits)}
            label={t("referral.statUsed", { defaultValue: "Ishlatilgan" })}
          />
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-bold text-background"
        >
          <Share2 className="h-4 w-4" />
          {t("referral.share", { defaultValue: "Havolani ulashish" })}
        </button>
      </ProfileSubpageCard>

      <ProfileSubpageCard className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate rounded-xl bg-muted/60 px-3 py-2.5 text-center font-mono text-lg font-bold tracking-[0.18em]">
            {data.code}
          </span>
          <button
            type="button"
            onClick={() => handleCopy(data.code, "code")}
            aria-label={t("referral.copyCode", { defaultValue: "Kodni nusxalash" })}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-border"
          >
            {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => handleCopy(inviteUrl, "link")}
            aria-label={t("referral.copyLink", { defaultValue: "Havoladan nusxa" })}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-border"
          >
            {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <p className="truncate text-[11px] text-muted-foreground">{inviteUrl}</p>
      </ProfileSubpageCard>

      <ProfileSubpageCard className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {invites.length > 0
            ? t("referral.invitedList", { defaultValue: "Taklif qilganlaringiz" })
            : t("referral.emptyTitle", { defaultValue: "Hali do'st yo'q" })}
        </p>
        {invites.length > 0 ? (
          <ul className="divide-y divide-border">
            {invites.map((invitee) => (
              <InviteeRow key={invitee.id} invitee={invitee} />
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">
            {t("referral.emptyHint", {
              defaultValue: "Havolani yuboring. Do'st ro'yxatdan o'tsa, 1 ta generatsiya qo'shiladi.",
            })}
          </p>
        )}
      </ProfileSubpageCard>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-2 py-2.5 text-center">
      <p className="text-xl font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
