import { LogOut } from "lucide-react";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { setLang } from "@/i18n/config";
import { cn } from "@/lib/utils";
import type { SettingsPageState } from "@/components/settings/useSettingsPage";
import { SETTINGS_LANGS } from "@/components/settings/useSettingsPage";

function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="rounded-xl border border-border bg-background p-5 shadow-[0_1px_2px_rgba(15,15,15,0.04)] lg:p-6">
        {children}
      </div>
    </section>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors",
        value ? "bg-foreground" : "bg-surface-2",
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-background transition-transform",
          value ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

export function SettingsFormSections({ state }: { state: SettingsPageState }) {
  const {
    t,
    activeLang,
    user,
    me,
    prefs,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    updatePref,
    resetPrefs,
    handleLogout,
    updateMe,
    setPw,
    changePw,
    notificationItems,
  } = state;

  return (
    <div className="space-y-10">
      <SettingsSection
        id="personal"
        title={t("settings.hubs.personal.title", { defaultValue: "Shaxsiy ma'lumotlar" })}
        description={t("settings.hubs.personal.desc", {
          defaultValue: "Ism, telefon va profil ma'lumotlari.",
        })}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">
              {t("settings.fields.name", { defaultValue: "To'liq ism" })}
            </span>
            <input
              type="text"
              defaultValue={user.name}
              key={user.name}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== user.name) {
                  updateMe.mutate({ full_name: next });
                }
              }}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium outline-none transition-colors focus:border-foreground"
            />
          </label>
          {user.phone ? (
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                {t("settings.fields.phone", { defaultValue: "Telefon" })}
              </span>
              <p className="mt-2 text-sm font-medium text-foreground">{user.phone}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("settings.fields.phoneHint", { defaultValue: "Telefon raqamini o'zgartirish uchun yordam markaziga murojaat qiling." })}
              </p>
            </div>
          ) : null}
        </div>
      </SettingsSection>

      {me?.has_password !== undefined ? (
        <SettingsSection
          id="security"
          title={t("settings.hubs.security.title", { defaultValue: "Kirish va xavfsizlik" })}
          description={t("settings.hubs.security.desc", {
            defaultValue: "Parolni yangilang va hisobingizni himoya qiling.",
          })}
        >
          <div className="space-y-4">
            {me.has_password === true ? (
              <>
                <label className="block">
                  <span className="text-sm font-medium text-muted-foreground">{t("settings.currentPassword")}</span>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium outline-none focus:border-foreground"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-muted-foreground">{t("settings.newPassword")}</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium outline-none focus:border-foreground"
                  />
                </label>
                <button
                  type="button"
                  disabled={changePw.isPending || newPassword.length < 8 || !oldPassword}
                  onClick={() => changePw.mutate()}
                  className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {t("settings.changePassword")}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t("settings.passwordNotSet")}</p>
                <label className="block">
                  <span className="text-sm font-medium text-muted-foreground">{t("settings.newPassword")}</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium outline-none focus:border-foreground"
                  />
                </label>
                <button
                  type="button"
                  disabled={setPw.isPending || newPassword.length < 8}
                  onClick={() => setPw.mutate()}
                  className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {t("settings.setPassword")}
                </button>
              </>
            )}
          </div>
        </SettingsSection>
      ) : null}

      <SettingsSection
        id="notifications"
        title={t("settings.hubs.notifications.title", { defaultValue: "Bildirishnoma afzalliklari" })}
        description={t("settings.hubs.notifications.desc", {
          defaultValue: "Eslatmalar va chat xabarlari.",
        })}
      >
        <div className="divide-y divide-border">
          {notificationItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <span className="text-sm font-medium">{item.label}</span>
              <Toggle value={prefs[item.key]} onChange={(v) => updatePref(item.key, v)} />
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        id="preferences"
        title={t("settings.hubs.preferences.title", { defaultValue: "Til va afzalliklar" })}
        description={t("settings.hubs.preferences.desc", {
          defaultValue: "Til, salon turi va ko'rinish sozlamalari.",
        })}
      >
        <div className="space-y-6">
          <div>
            <p className="mb-3 text-sm font-medium">{t("settings.preferredAudience")}</p>
            <AudienceSwitch showProfileHint={false} />
          </div>
          <div>
            <p className="mb-3 text-sm font-medium">{t("settings.language")}</p>
            <div className="divide-y divide-border rounded-lg border border-border">
              {SETTINGS_LANGS.map((lang) => {
                const active = activeLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => void setLang(lang.code)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface/60"
                  >
                    <span className="text-sm font-medium">{lang.label}</span>
                    <div
                      className={cn(
                        "h-5 w-5 rounded-full border-2",
                        active ? "border-foreground bg-foreground" : "border-border",
                      )}
                    >
                      {active ? <div className="m-1 h-1.5 w-1.5 rounded-full bg-background" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SettingsSection>

      <div className="flex flex-col gap-3 border-t border-border pt-8 sm:flex-row">
        <button
          type="button"
          onClick={resetPrefs}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface"
        >
          {t("settings.reset")}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          {t("common.logout")}
        </button>
      </div>
    </div>
  );
}
