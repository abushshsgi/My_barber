import { Link } from "@tanstack/react-router";
import { Database, Lock, MapPin, Shield } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ProfileSubpageCard } from "@/components/profile/ProfileSubpageLayout";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useMorphAiPrivacy } from "@/hooks/use-morph-ai-privacy";
import { cn } from "@/lib/utils";

function fmtTokens(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return n.toLocaleString("uz-UZ");
}

export function SettingsPrivacyPanel({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const { loggedIn, query, patch, wipe } = useMorphAiPrivacy();
  const data = query.data;
  const prefs = data?.prefs;
  const counts = data?.data;
  const limits = data?.limits;

  const setPref = (key: keyof NonNullable<typeof prefs>, value: boolean) => {
    patch.mutate(
      { [key]: value },
      {
        onSuccess: () => toast.success(t("settings.saved", { defaultValue: "Saqlandi" })),
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const confirmWipe = (kind: "chats" | "looks" | "selfies" | "all", label: string) => {
    if (!window.confirm(label)) return;
    wipe.mutate(kind, {
      onSuccess: () => toast.success(t("settings.morphPrivacy.deleted")),
      onError: (err: Error) => toast.error(err.message),
    });
  };

  return (
    <div className={embedded ? "mt-4 space-y-4" : "space-y-4"}>
      <ProfileSubpageCard>
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
            <Shield className="size-4 text-foreground" strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              {t("settings.morphPrivacy.policyTitle")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("settings.morphPrivacy.policyBody")}
            </p>
          </div>
        </div>
      </ProfileSubpageCard>

      <ProfileSubpageCard>
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
            <MapPin className="size-4 text-foreground" strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              {t("settings.morphPrivacy.locationTitle")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("settings.morphPrivacy.locationBody")}
            </p>
          </div>
        </div>
      </ProfileSubpageCard>

      {!loggedIn ? (
        <ProfileSubpageCard>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("settings.morphPrivacy.loginHint")}
          </p>
          <Button asChild className="mt-4 cursor-pointer">
            <Link to="/auth">{t("auth.login", { defaultValue: "Kirish" })}</Link>
          </Button>
        </ProfileSubpageCard>
      ) : (
        <>
          <ProfileSubpageCard>
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
                <Lock className="size-4 text-foreground" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold tracking-tight">
                  {t("settings.morphPrivacy.morphTitle")}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("settings.morphPrivacy.morphLead")}
                </p>
                {limits ? (
                  <p className="mt-3 text-sm font-medium">
                    {t("settings.morphPrivacy.limitValue", {
                      used: fmtTokens(limits.token_used ?? limits.daily_used),
                      limit: fmtTokens(limits.token_limit ?? limits.daily_limit),
                      remaining: fmtTokens(limits.token_remaining ?? limits.daily_remaining),
                    })}
                  </p>
                ) : null}
                {limits?.should_warn ? (
                  <p className="mt-2 rounded-xl bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                    {t("settings.morphPrivacy.limitWarn", {
                      remaining: fmtTokens(limits.token_remaining ?? limits.daily_remaining),
                      limit: fmtTokens(limits.token_limit ?? limits.daily_limit),
                    })}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 divide-y divide-border">
              <PrivacyToggle
                title={t("settings.morphPrivacy.privacyLocal")}
                hint={t("settings.morphPrivacy.privacyLocalHint")}
                value={Boolean(prefs?.privacy_local_only)}
                disabled={patch.isPending || query.isLoading}
                onChange={(v) => {
                  if (v && !window.confirm(t("settings.morphPrivacy.privacyOnBody"))) return;
                  setPref("privacy_local_only", v);
                }}
              />
              <PrivacyToggle
                title={t("settings.morphPrivacy.saveHistory")}
                hint={t("settings.morphPrivacy.saveHistoryHint")}
                value={Boolean(prefs?.save_chat_history ?? true)}
                disabled={patch.isPending || query.isLoading}
                onChange={(v) => setPref("save_chat_history", v)}
              />
              <PrivacyToggle
                title={t("settings.morphPrivacy.persistLooks")}
                hint={t("settings.morphPrivacy.persistLooksHint")}
                value={Boolean(prefs?.persist_looks ?? true)}
                disabled={patch.isPending || query.isLoading}
                onChange={(v) => setPref("persist_looks", v)}
              />
              <PrivacyToggle
                title={t("settings.morphPrivacy.limitNotify")}
                hint={t("settings.morphPrivacy.limitNotifyHint")}
                value={Boolean(prefs?.limit_notify ?? true)}
                disabled={patch.isPending || query.isLoading}
                onChange={(v) => setPref("limit_notify", v)}
              />
            </div>
          </ProfileSubpageCard>

          <ProfileSubpageCard>
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
                <Database className="size-4 text-foreground" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold tracking-tight">
                  {t("settings.morphPrivacy.dataTitle")}
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {t("settings.morphPrivacy.dataChats")}
                    </span>
                    <span className="font-medium">{counts?.chat_threads ?? "—"}</span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {t("settings.morphPrivacy.dataLooks")}
                    </span>
                    <span className="font-medium">{counts?.looks ?? "—"}</span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {t("settings.morphPrivacy.dataSelfies")}
                    </span>
                    <span className="font-medium">{counts?.selfies ?? "—"}</span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {t("settings.morphPrivacy.dataShares")}
                    </span>
                    <span className="font-medium">{counts?.shares ?? "—"}</span>
                  </li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    disabled={wipe.isPending}
                    onClick={() => confirmWipe("chats", t("settings.morphPrivacy.deleteChatsBody"))}
                  >
                    {t("settings.morphPrivacy.deleteChats")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    disabled={wipe.isPending}
                    onClick={() => confirmWipe("looks", t("settings.morphPrivacy.deleteLooksBody"))}
                  >
                    {t("settings.morphPrivacy.deleteLooks")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="cursor-pointer"
                    disabled={wipe.isPending}
                    onClick={() => confirmWipe("all", t("settings.morphPrivacy.deleteAllBody"))}
                  >
                    {t("settings.morphPrivacy.deleteAll")}
                  </Button>
                </div>
              </div>
            </div>
          </ProfileSubpageCard>
        </>
      )}
    </div>
  );
}

function PrivacyToggle({
  title,
  hint,
  value,
  disabled,
  onChange,
}: {
  title: string;
  hint: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 py-3 first:pt-0 last:pb-0",
        disabled && "opacity-60",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={value} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}
