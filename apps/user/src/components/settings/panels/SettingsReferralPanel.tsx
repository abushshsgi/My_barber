import { Check, Copy, Gift, Loader2, PartyPopper, Share2, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ProfileSubpageCard } from "@/components/profile/ProfileSubpageLayout";
import { ReferralClaimCelebration } from "@/components/settings/panels/ReferralClaimCelebration";
import { SubscriptionVerifiedBadge } from "@/components/subscriptions/SubscriptionVerifiedBadge";
import { useClaimReferralTrial, useMyReferral } from "@/hooks/use-referral";
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
  const joined = invitee.joined_at
    ? new Date(invitee.joined_at).toLocaleDateString("uz-UZ")
    : null;
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
  const claim = useClaimReferralTrial();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const inviteUrl = data ? resolveShareInviteUrl(data.code, data.invite_url) : "";
  const invites = data?.invites ?? [];
  const trial = data?.trial;
  const canClaim = Boolean(trial?.eligible && !trial?.granted);

  const closeCelebrate = useCallback(() => setCelebrate(false), []);

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

  const handleClaim = async () => {
    if (!canClaim || claim.isPending) return;
    try {
      const result = await claim.mutateAsync();
      if (result.trial?.granted) {
        setCelebrate(true);
        toast.success(
          t("referral.claimSuccess", {
            defaultValue: "Tabriklaymiz! Starter sinov faollashtirildi.",
          }),
        );
      }
    } catch {
      toast.error(
        t("referral.claimFailed", {
          defaultValue: "Bonusni olishning iloji bo'lmadi. Qayta urinib ko'ring.",
        }),
      );
    }
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

  return (
    <div className="space-y-4">
      <ReferralClaimCelebration
        open={celebrate}
        title={t("referral.celebrateTitle", { defaultValue: "Tabriklaymiz!" })}
        subtitle={t("referral.celebrateSubtitle", {
          days: trial?.days ?? 7,
          defaultValue: "{{days}} kunlik Starter sinov faollashtirildi. Morph AI dan bemalol foydalaning!",
        })}
        ctaLabel={t("referral.celebrateCta", { defaultValue: "Zo'r!" })}
        onClose={closeCelebrate}
      />

      <ProfileSubpageCard className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {t("referral.intro", {
            defaultValue:
              "8 belgilik kodingizni yoki havolani ulashing. Do'stingiz ro'yxatdan o'tishda shu kodni kiritadi (yoki havola avtomatik qo'llaydi).",
          })}
        </p>
      </ProfileSubpageCard>

      <ProfileSubpageCard className="space-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {t("referral.yourCode", { defaultValue: "Sizning kodingiz" })}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex-1 rounded-xl border border-border bg-surface px-3 py-3 text-center font-mono text-2xl font-bold tracking-[0.22em]">
              {data.code}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(data.code, "code")}
              aria-label={t("referral.copyCode", { defaultValue: "Kodni nusxalash" })}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border transition-colors hover:bg-muted/40"
            >
              {copied === "code" ? (
                <Check className="h-5 w-5 text-emerald-600" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {t("referral.yourLink", { defaultValue: "Taklif havolasi" })}
          </p>
          <p className="mt-2 break-all rounded-xl border border-border bg-surface px-3 py-3 text-xs text-muted-foreground">
            {inviteUrl}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-bold text-background"
          >
            <Share2 className="h-4 w-4" />
            {t("referral.share", { defaultValue: "Havolani ulashish" })}
          </button>
          <button
            type="button"
            onClick={() => handleCopy(inviteUrl, "link")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-bold"
          >
            {copied === "link" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {t("referral.copyLink", { defaultValue: "Havoladan nusxa" })}
          </button>
        </div>
      </ProfileSubpageCard>

      <ProfileSubpageCard>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              {t("referral.invitedCount", {
                count: data.invite_count,
                defaultValue: "{{count}} kishi taklif qilingan",
              })}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("referral.invitedHint", { defaultValue: "Kodingiz orqali qo'shilganlar soni." })}
            </p>
          </div>
        </div>
      </ProfileSubpageCard>

      {trial ? (
        <ProfileSubpageCard className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface">
              <Gift className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {trial.required} ta do'st → {trial.days} kun Starter sinov
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {trial.granted
                  ? trial.ends_at
                    ? `Sinov berilgan · tugash: ${new Date(trial.ends_at).toLocaleDateString("uz-UZ")}`
                    : "Sinov berilgan"
                  : `Progress: ${trial.progress} / ${trial.required}`}
              </p>
            </div>
          </div>
          {!trial.granted ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground transition-all"
                style={{
                  width: `${Math.min(100, Math.round((trial.progress / trial.required) * 100))}%`,
                }}
              />
            </div>
          ) : null}
          {canClaim ? (
            <button
              type="button"
              onClick={handleClaim}
              disabled={claim.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-bold text-background disabled:opacity-60"
            >
              {claim.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PartyPopper className="h-4 w-4" />
              )}
              {t("referral.claimBonus", { defaultValue: "Bonusni olish" })}
            </button>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            8-kuni sinov avtomatik to'xtaydi. Keyin Starter / Plus / Pro obunasini sotib oling.
          </p>
        </ProfileSubpageCard>
      ) : (
        <ProfileSubpageCard>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface">
              <Gift className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">
              3 ta do'stni taklif qilsangiz — 7 kunlik Starter Morph AI sinovi beriladi.
            </p>
          </div>
        </ProfileSubpageCard>
      )}

      {invites.length > 0 ? (
        <ProfileSubpageCard className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {t("referral.invitedList", { defaultValue: "Taklif qilganlaringiz" })}
          </p>
          <ul className="divide-y divide-border">
            {invites.map((invitee) => (
              <InviteeRow key={invitee.id} invitee={invitee} />
            ))}
          </ul>
        </ProfileSubpageCard>
      ) : null}
    </div>
  );
}
