import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Contrast,
  Flag,
  Folder,
  Globe,
  Lock,
  Mail,
  Mic,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { useMorphAppearance } from "@/hooks/use-morph-appearance";
import { useMe } from "@/hooks/use-me";
import { useMorphAiPrivacy } from "@/hooks/use-morf-ai-privacy";
import { setLang, type AppLang } from "@/i18n/config";
import { LANG_FLAGS } from "@/lib/locale-display";
import { MorphAppearanceSettings } from "@/components/settings/MorphAppearanceSettings";
import { deleteMyAccount } from "@/lib/api/user";
import type { MorphChatLimits } from "@/lib/api/ai";
import { logout } from "@/lib/auth";
import { TELEGRAM_SUPPORT_HANDLE, TELEGRAM_SUPPORT_URL } from "@/lib/support-contact";
import { patchMorphAiPrefs, readMorphAiPrefs } from "@/lib/morf-ai-prefs";
import { cn } from "@/lib/utils";

type Page = "hub" | "appearance" | "limits" | "data" | "language";

type ConfirmSpec = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  run: () => Promise<void> | void;
};

const THREADS_KEY = "mysaloon.morphAi.chat.threads.v2";
const LEGACY_THREADS_KEY = "mysaloon.morphAi.chat.threads.v1";

const LANGS: { code: AppLang; labelKey: "profile.languageUz" | "profile.languageRu" | "profile.languageEn" }[] = [
  { code: "uz", labelKey: "profile.languageUz" },
  { code: "ru", labelKey: "profile.languageRu" },
  { code: "en", labelKey: "profile.languageEn" },
];

function usagePercent(limits: MorphChatLimits | null | undefined): number {
  if (!limits?.daily_limit || limits.daily_used == null) return 0;
  return Math.max(0, Math.min(100, Math.round((limits.daily_used / limits.daily_limit) * 100)));
}

function clearLocalChats() {
  localStorage.removeItem(THREADS_KEY);
  localStorage.removeItem(LEGACY_THREADS_KEY);
}

function readLocalThreads(): Array<{ title?: string; messages?: Array<{ role?: string; content?: string }> }> {
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Morf mobil sozlamalar — ilovadagi MorphChatSettingsScreen tartibi va API. */
export function MorphMobileSettings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const privacy = useMorphAiPrivacy();
  const appearance = useMorphAppearance();
  const [page, setPage] = useState<Page>("hub");
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remote = privacy.query.data;
  const [prefs, setPrefs] = useState(() => readMorphAiPrefs());
  useEffect(() => {
    if (!remote?.prefs) return;
    setPrefs({
      privacyLocalOnly: remote.prefs.privacy_local_only,
      saveHistory: remote.prefs.save_chat_history,
      persistLooks: remote.prefs.persist_looks,
      limitNotify: remote.prefs.limit_notify,
      useTryOnContext: remote.prefs.use_tryon_context,
      streaming: readMorphAiPrefs().streaming,
    });
  }, [remote]);
  const counts = remote?.data ?? {
    chat_threads: 0,
    chat_messages: 0,
    looks: 0,
    selfies: 0,
    shares: 0,
  };
  const limits = remote?.limits ?? null;
  const pct = usagePercent(limits);
  const name = me?.full_name?.trim() || t("profile.guest", { defaultValue: "Foydalanuvchi" });
  const email = me?.display_email || "";
  const phone = me?.phone || "";
  const contactValue = email || phone;
  const contactTitle = email
    ? t("chat.settings.email", { defaultValue: "Elektron pochta" })
    : phone
      ? t("settings.fields.phone", { defaultValue: "Telefon" })
      : t("chat.settings.email", { defaultValue: "Elektron pochta" });
  const contactEmpty = t("chat.settings.emailEmpty", { defaultValue: "Pochta ulanmagan" });
  const lang = (i18n.resolvedLanguage || i18n.language || "uz").split("-")[0];

  const limitTitle =
    limits?.period === "lifetime"
      ? t(pct >= 100 ? "chat.settings.limitTitleOnce" : "chat.settings.limitTitleFree", {
          defaultValue: pct >= 100 ? "Bepul limit tugadi" : "Bepul limit",
        })
      : t("chat.settings.limitTitle", { defaultValue: "Oylik AI limiti" });

  const patch = (next: {
    privacy_local_only?: boolean;
    save_chat_history?: boolean;
    persist_looks?: boolean;
    limit_notify?: boolean;
  }) => {
    const saved = patchMorphAiPrefs({
      ...(next.privacy_local_only !== undefined ? { privacyLocalOnly: next.privacy_local_only } : {}),
      ...(next.save_chat_history !== undefined ? { saveHistory: next.save_chat_history } : {}),
      ...(next.persist_looks !== undefined ? { persistLooks: next.persist_looks } : {}),
      ...(next.limit_notify !== undefined ? { limitNotify: next.limit_notify } : {}),
    });
    setPrefs(saved);
    if (!privacy.loggedIn) return;
    privacy.patch.mutate(next, {
      onError: (err: Error) => setError(err.message || t("chat.settings.dataFail", { defaultValue: "Amalga oshmadi" })),
    });
  };

  const ask = (spec: ConfirmSpec) => {
    setError(null);
    setConfirm(spec);
  };

  const runConfirm = async () => {
    if (!confirm || busy) return;
    setBusy(true);
    try {
      await confirm.run();
      setConfirm(null);
    } catch (err) {
      setConfirm(null);
      setError(err instanceof Error ? err.message : t("chat.settings.dataFail", { defaultValue: "Amalga oshmadi" }));
    } finally {
      setBusy(false);
    }
  };

  const wipe = (kind: "chats" | "looks" | "selfies", title: string, body: string) => {
    ask({
      title,
      body,
      confirmLabel: t("common.yes", { defaultValue: "Ha" }),
      cancelLabel: t("common.no", { defaultValue: "Yo‘q" }),
      run: async () => {
        await privacy.wipe.mutateAsync(kind);
        if (kind === "chats") clearLocalChats();
      },
    });
  };

  const exportChats = () => {
    const threads = readLocalThreads();
    if (!threads.length) {
      setError(t("chat.settings.exportEmpty", { defaultValue: "Export qilish uchun suhbat yo‘q" }));
      return;
    }
    const text = threads
      .map((thread, index) => {
        const lines = (thread.messages ?? [])
          .filter((message) => (message.content || "").trim())
          .map((message) => `${message.role === "user" ? "Siz" : "Morf"}: ${(message.content || "").trim()}`);
        return `${index + 1}. ${thread.title || "Chat"}\n${lines.join("\n")}`;
      })
      .join("\n\n---\n\n");
    const blob = new Blob([`Morf AI\n\n${text}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "morf-ai-chat.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const title =
    page === "appearance"
      ? t("chat.settings.appearance", { defaultValue: "Ko‘rinish" })
      : page === "limits"
        ? limitTitle
        : page === "data"
          ? t("chat.settings.dataGroup", { defaultValue: "Ma’lumotlar" })
          : page === "language"
            ? t("profile.language", { defaultValue: "Til" })
            : "";

  return (
    <div className="-mx-4 min-h-[70vh] bg-[var(--morph-bg,var(--background))] px-4 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] pt-[max(0.75rem,env(safe-area-inset-top))] text-[var(--morph-fg,inherit)] sm:-mx-6 md:-mx-8">
      {page === "hub" ? (
        <Link to="/profile" aria-label={t("common.back", { defaultValue: "Orqaga" })} className="inline-flex size-9 items-center justify-center">
          <ChevronLeft className="size-5" />
        </Link>
      ) : (
        <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center">
          <button type="button" aria-label={t("common.back", { defaultValue: "Orqaga" })} onClick={() => setPage("hub")} className="inline-flex size-9 items-center justify-center">
            <ChevronLeft className="size-5" />
          </button>
          <p className="truncate text-center text-[15px] font-semibold">{title}</p>
          <span />
        </div>
      )}

      {error ? (
        <p className="mt-3 rounded-2xl bg-[#FF453A]/10 px-3 py-2 text-sm text-[#FF453A]">{error}</p>
      ) : null}

      {page === "hub" ? (
        <>
          <div className="flex flex-col items-center pb-7 pt-2">
            <div className="relative [&_button.mt-1]:hidden">
              <UserAvatar name={name} src={me?.avatar} size={88} editable={privacy.loggedIn} />
              <span className="pointer-events-none absolute bottom-0 right-0 grid size-7 place-items-center rounded-full border-2 border-[var(--morph-bg,#fafafa)] bg-[var(--morph-card,#fff)]">
                <span className="text-[11px] font-bold">✎</span>
              </span>
            </div>
            <p className="mt-3 text-xl font-semibold tracking-tight">{name}</p>
          </div>

          {privacy.query.isLoading ? (
            <p className="py-8 text-center text-sm text-[var(--morph-muted,#737373)]">…</p>
          ) : (
            <>
              <Section title={t("chat.settings.configureGroup", { defaultValue: "Morfni sozlash" })}>
                <Item
                  icon={SlidersHorizontal}
                  title={t("chat.settings.personalization", { defaultValue: "Shaxsiylashtirish" })}
                  subtitle={t("common.soon", { defaultValue: "Tez orada" })}
                />
                <Item
                  icon={Globe}
                  title={t("profile.language", { defaultValue: "Til" })}
                  subtitle={t(LANGS.find((item) => item.code === lang)?.labelKey ?? "profile.languageUz")}
                  onClick={() => setPage("language")}
                  last
                />
              </Section>

              <Section title={t("chat.settings.accountGroup", { defaultValue: "Hisob" })}>
                <Item
                  icon={Mail}
                  title={contactTitle}
                  subtitle={contactValue || contactEmpty}
                />
                <button type="button" onClick={() => setPage("limits")} className="flex w-full items-center pl-3.5 text-left">
                  <span className="w-[3.25rem] shrink-0 pr-2">
                    <span className="block h-1.5 overflow-hidden rounded-full bg-black/10">
                      <span className="block h-full rounded-full bg-[var(--morph-fg,#111)]" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="mt-1 block text-right text-[11px] font-bold">{pct}%</span>
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-2 border-b border-black/10 py-3.5 pr-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{limitTitle}</span>
                      <span className="mt-0.5 block text-xs text-[var(--morph-muted,#737373)]">
                        {t("chat.settings.limitUsedPct", { pct, defaultValue: "{{pct}}% ishlatilgan" })}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-[var(--morph-muted,#737373)]" />
                  </span>
                </button>
                <Item
                  icon={Sparkles}
                  title={t("chat.settings.upgradePlan", { defaultValue: "Tarifni yangilash" })}
                  onClick={() => void navigate({ to: "/subscriptions" })}
                  last
                />
              </Section>

              <Section title={t("chat.settings.appSettingsGroup", { defaultValue: "Ilova sozlamalari" })}>
                <Item
                  icon={RotateCcw}
                  title={t("care.quiz.retake", { defaultValue: "Qayta" })}
                  subtitle={t("care.onboarding.badge", { defaultValue: "Soch tahlili" })}
                  onClick={() => {
                    sessionStorage.setItem("mysaloon.care.retake", "1");
                    void navigate({ to: "/ai-style/care" });
                  }}
                />
                <Item
                  icon={Contrast}
                  title={t("chat.settings.appearance", { defaultValue: "Ko‘rinish" })}
                  subtitle={
                    appearance.appearance.theme === "dark"
                      ? t("chat.settings.themeDark", { defaultValue: "Qorong‘i rejim" })
                      : t("chat.settings.themeLight", { defaultValue: "Yorug‘ rejim" })
                  }
                  onClick={() => setPage("appearance")}
                />
                <Item
                  icon={Bell}
                  title={t("chat.settings.limitNotify", { defaultValue: "Limit ogohlantirishi" })}
                  subtitle={
                    prefs.limitNotify
                      ? t("chat.settings.limitNotifyOn", { defaultValue: "Yoqilgan" })
                      : t("chat.settings.limitNotifyOff", { defaultValue: "O‘chirilgan" })
                  }
                  onClick={() => setPage("limits")}
                />
                <Item
                  icon={Mic}
                  title={t("chat.settings.voiceInput", { defaultValue: "Ovozli kiritish" })}
                  subtitle={t("common.soon", { defaultValue: "Tez orada" })}
                  disabled
                />
                <Item
                  icon={Lock}
                  title={t("chat.settings.privacyLocal", { defaultValue: "Tarixni serverga yubormaslik" })}
                  subtitle={
                    prefs.privacyLocalOnly
                      ? t("chat.settings.privacyOn", { defaultValue: "Serverga yuborilmaydi" })
                      : t("chat.settings.privacyOff", { defaultValue: "Serverga yoziladi" })
                  }
                  onClick={() => setPage("data")}
                />
                <Item
                  icon={Folder}
                  title={t("chat.settings.dataGroup", { defaultValue: "Ma’lumotlar" })}
                  subtitle={t("chat.settings.dataHubHint", {
                    chats: counts.chat_threads,
                    looks: counts.looks,
                    defaultValue: "{{chats}} suhbat · {{looks}} look",
                  })}
                  onClick={() => setPage("data")}
                  last
                />
              </Section>

              <Section title={t("chat.settings.helpGroup", { defaultValue: "Yordam" })}>
                <Item
                  icon={Flag}
                  title={t("chat.settings.reportProblem", { defaultValue: "Muammo haqida xabar berish" })}
                  onClick={() => void navigate({ to: "/ai-style/report" })}
                />
                <Item
                  icon={CircleHelp}
                  title={t("chat.settings.helpCenter", { defaultValue: "Yordam markazi" })}
                  onClick={() => void navigate({ to: "/ai-style/help" })}
                />
                <Item
                  icon={Send}
                  title={t("chat.settings.telegramSupport", { defaultValue: "Telegram orqali yozish" })}
                  subtitle={TELEGRAM_SUPPORT_HANDLE}
                  onClick={() => window.open(TELEGRAM_SUPPORT_URL, "_blank", "noopener,noreferrer")}
                  last
                />
              </Section>

              {privacy.loggedIn ? (
                <div className="overflow-hidden rounded-[18px] border border-black/10 bg-[var(--morph-card,#fff)]">
                  <button
                    type="button"
                    onClick={() =>
                      ask({
                        title: t("chat.settings.clearTitle", { defaultValue: "Akkauntni o‘chirmoqchimisiz?" }),
                        body: t("chat.settings.clearBody", {
                          defaultValue:
                            "Akkaunt, suhbatlar va obuna o‘chiriladi. Keyin login ochiladi.",
                        }),
                        confirmLabel: t("chat.settings.clearConfirm", { defaultValue: "O‘chirish" }),
                        cancelLabel: t("chat.settings.clearCancel", { defaultValue: "Bekor" }),
                        run: async () => {
                          await deleteMyAccount();
                          clearLocalChats();
                          logout();
                          void navigate({ to: "/auth", replace: true });
                        },
                      })
                    }
                    className="flex w-full items-center gap-3.5 px-3.5 py-3.5 text-left text-[#FF453A]"
                  >
                    <span className="grid size-8 place-items-center rounded-[10px] bg-black/5">
                      <Trash2 className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="text-[15px] font-semibold">
                      {t("chat.settings.clearChats", { defaultValue: "Akkauntni o‘chirish" })}
                    </span>
                  </button>
                </div>
              ) : null}
            </>
          )}
        </>
      ) : null}

      {page === "language" ? (
        <Section>
          {LANGS.map((item, index) => (
            <button
              key={item.code}
              type="button"
              onClick={() => void setLang(item.code)}
              className={cn(
                "flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] font-semibold",
                index < LANGS.length - 1 && "border-b border-border",
                lang === item.code && "bg-muted",
              )}
            >
              <span className="flex items-center gap-3">
                <span className="text-lg" aria-hidden>
                  {LANG_FLAGS[item.code]}
                </span>
                {t(item.labelKey)}
              </span>
              {lang === item.code ? <span className="text-xs">✓</span> : null}
            </button>
          ))}
        </Section>
      ) : null}

      {page === "appearance" ? (
        <div className="pt-2">
          <MorphAppearanceSettings embedded />
        </div>
      ) : null}

      {page === "limits" ? (
        <>
          <div className="mb-4 rounded-[18px] border border-black/10 bg-[var(--morph-card,#fff)] p-4">
            <div className="h-2 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-[var(--morph-fg,#111)]" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-sm text-[var(--morph-muted,#737373)]">
              {t("chat.settings.limitUsedPct", { pct, defaultValue: "{{pct}}% ishlatilgan" })}
              {" · "}
              {t("chat.settings.limitLeftPct", { pct: Math.max(0, 100 - pct), defaultValue: "{{pct}}% qolgan" })}
            </p>
          </div>
          <Section>
            <Toggle
              title={t("chat.settings.limitNotify", { defaultValue: "Limit ogohlantirishi" })}
              subtitle={t("chat.settings.limitNotifyHint", { defaultValue: "Token limiti tugashiga yaqin xabar" })}
              value={prefs.limitNotify}
              onChange={(value) => patch({ limit_notify: value })}
              last
            />
          </Section>
          <Section>
            <Item
              icon={Sparkles}
              title={t("chat.settings.upgradePlan", { defaultValue: "Tarifni yangilash" })}
              subtitle={t("chat.settings.subscriptionHint", { defaultValue: "Limit va imkoniyatlarni kengaytirish" })}
              onClick={() => void navigate({ to: "/subscriptions" })}
              last
            />
          </Section>
        </>
      ) : null}

      {page === "data" ? (
        <>
          <p className="mb-4 px-1 text-sm text-[var(--morph-muted,#737373)]">
            {t("chat.settings.dataLead", { defaultValue: "Serverda nima saqlanganini ko‘ring, export qiling yoki o‘chiring." })}
          </p>
          <Section title={t("chat.settings.dataServer", { defaultValue: "Serverdagi ma’lumotlar" })}>
            <Item icon={Mail} title={t("chat.settings.dataChats", { defaultValue: "Chat suhbatlari" })} value={String(counts.chat_threads)} />
            <Item icon={Folder} title={t("chat.settings.dataLooks", { defaultValue: "Try-on looklar" })} value={String(counts.looks)} />
            <Item icon={SlidersHorizontal} title={t("chat.settings.dataSelfies", { defaultValue: "Selfie tahlillari" })} value={String(counts.selfies)} />
            <Item icon={Sparkles} title={t("chat.settings.dataShares", { defaultValue: "Ulashilgan looklar" })} value={String(counts.shares)} last />
          </Section>
          {!privacy.query.isSuccess && privacy.loggedIn ? (
            <p className="mb-4 text-xs text-[var(--morph-muted,#737373)]">
              {t("chat.settings.dataOffline", { defaultValue: "Serverga ulanmadi — mahalliy sozlamalar saqlanadi." })}
            </p>
          ) : null}
          <Section title={t("chat.settings.privacyGroup", { defaultValue: "Maxfiylik" })}>
            <Toggle
              title={t("chat.settings.privacyLocal", { defaultValue: "Tarixni serverga yubormaslik" })}
              subtitle={t("chat.settings.privacyLocalHint", { defaultValue: "Faqat joriy xabar yuboriladi" })}
              value={prefs.privacyLocalOnly}
              onChange={(value) => {
                if (value) {
                  ask({
                    title: t("chat.settings.privacyOnTitle", { defaultValue: "Tarixni serverga yubormaslik" }),
                    body: t("chat.settings.privacyOnBody", {
                      defaultValue: "Yangi suhbatlar serverda saqlanmaydi. Allaqachon yozilgan chatlar o‘chiriladi.",
                    }),
                    confirmLabel: t("common.yes", { defaultValue: "Ha" }),
                    cancelLabel: t("common.no", { defaultValue: "Yo‘q" }),
                    run: () => patch({ privacy_local_only: true }),
                  });
                  return;
                }
                patch({ privacy_local_only: false });
              }}
            />
            <Toggle
              title={t("chat.settings.saveHistory", { defaultValue: "Chat tarixini saqlash" })}
              subtitle={t("chat.settings.saveHistoryHint", { defaultValue: "O‘chirilsa suhbatlar qurilmada qolmaydi" })}
              value={prefs.saveHistory}
              onChange={(value) => patch({ save_chat_history: value })}
            />
            <Toggle
              title={t("chat.settings.persistLooks", { defaultValue: "Looklarni serverda saqlash" })}
              subtitle={t("chat.settings.persistLooksHint", { defaultValue: "O‘chirilsa try-on faqat shu qurilmada qoladi" })}
              value={prefs.persistLooks}
              onChange={(value) => patch({ persist_looks: value })}
              last
            />
          </Section>
          <Section title={t("chat.settings.dataActions", { defaultValue: "Harakatlar" })}>
            <Item
              icon={Folder}
              title={t("chat.settings.exportChats", { defaultValue: "Suhbatlarni export" })}
              subtitle={t("chat.settings.exportChatsHint", {
                count: readLocalThreads().length,
                defaultValue: "{{count}} ta suhbatni matn sifatida ulashish",
              })}
              onClick={exportChats}
            />
            <Item
              icon={Trash2}
              title={t("chat.settings.deleteServerChats", { defaultValue: "Serverdagi chatlarni o‘chirish" })}
              subtitle={t("chat.settings.deleteServerChatsHint", { count: counts.chat_threads, defaultValue: "{{count}} ta suhbat" })}
              danger
              onClick={() =>
                wipe(
                  "chats",
                  t("chat.settings.deleteServerChats", { defaultValue: "Serverdagi chatlarni o‘chirish" }),
                  t("chat.settings.deleteServerChatsBody", { defaultValue: "Serverdagi barcha Morf AI suhbatlari o‘chiriladi." }),
                )
              }
            />
            <Item
              icon={Trash2}
              title={t("chat.settings.deleteLooks", { defaultValue: "Look tarixini o‘chirish" })}
              subtitle={t("chat.settings.deleteLooksHint", { count: counts.looks, defaultValue: "{{count}} ta look" })}
              danger
              onClick={() =>
                wipe(
                  "looks",
                  t("chat.settings.deleteLooks", { defaultValue: "Look tarixini o‘chirish" }),
                  t("chat.settings.deleteLooksBody", { defaultValue: "Serverdagi try-on va studio rasmlari o‘chiriladi." }),
                )
              }
            />
            <Item
              icon={Trash2}
              title={t("chat.settings.deleteSelfies", { defaultValue: "Selfie tarixini o‘chirish" })}
              subtitle={t("chat.settings.deleteSelfiesHint", { count: counts.selfies, defaultValue: "{{count}} ta selfie" })}
              danger
              last
              onClick={() =>
                wipe(
                  "selfies",
                  t("chat.settings.deleteSelfies", { defaultValue: "Selfie tarixini o‘chirish" }),
                  t("chat.settings.deleteSelfiesBody", { defaultValue: "Serverdagi yuz tahlili selfielari o‘chiriladi." }),
                )
              }
            />
          </Section>
        </>
      ) : null}

      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-4" onClick={() => { if (!busy) setConfirm(null); }}>
          <div
            className="w-full rounded-3xl bg-[var(--morph-card,#fff)] p-4 text-[var(--morph-fg,#111)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-base font-semibold">{confirm.title}</p>
            <p className="mt-2 text-sm text-[var(--morph-muted,#737373)]">{confirm.body}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => setConfirm(null)} className="rounded-full border border-black/10 py-3 text-sm font-semibold">
                {confirm.cancelLabel}
              </button>
              <button type="button" disabled={busy} onClick={() => void runConfirm()} className="rounded-full bg-[#FF453A] py-3 text-sm font-semibold text-white disabled:opacity-60">
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      {title ? <p className="mb-2 ml-3 text-xs text-[var(--morph-muted,#737373)]">{title}</p> : null}
      <div className="overflow-hidden rounded-[18px] border border-black/10 bg-[var(--morph-card,#fff)]">{children}</div>
    </section>
  );
}

function Item({
  icon: Icon,
  title,
  subtitle,
  value,
  onClick,
  last,
  disabled,
  danger,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  value?: string;
  onClick?: () => void;
  last?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  const body = (
    <span className={cn("flex min-h-[58px] items-stretch pl-3.5", disabled && "opacity-55")}>
      <span className="my-auto grid size-8 shrink-0 place-items-center rounded-[10px] bg-black/5">
        <Icon className={cn("size-5", danger && "text-[#FF453A]")} strokeWidth={1.75} />
      </span>
      <span className={cn("ml-3.5 flex min-w-0 flex-1 items-center gap-2 py-3.5 pr-3.5", !last && "border-b border-black/10")}>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[15px] font-semibold", danger && "text-[#FF453A]")}>{title}</span>
          {subtitle ? <span className="mt-0.5 block text-xs text-[var(--morph-muted,#737373)]">{subtitle}</span> : null}
        </span>
        {value ? <span className="text-sm text-[var(--morph-muted,#737373)]">{value}</span> : null}
        {onClick && !disabled ? <ChevronRight className="size-4 shrink-0 text-[var(--morph-muted,#737373)]" /> : null}
      </span>
    </span>
  );
  if (!onClick || disabled) return <div>{body}</div>;
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {body}
    </button>
  );
}

function Toggle({
  title,
  subtitle,
  value,
  onChange,
  last,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn("flex w-full items-center gap-3 px-4 py-3.5 text-left", !last && "border-b border-black/10")}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        {subtitle ? <span className="mt-0.5 block text-xs text-[var(--morph-muted,#737373)]">{subtitle}</span> : null}
      </span>
      <span className={cn("relative h-7 w-12 shrink-0 rounded-full", value ? "bg-[var(--morph-fg,#111)]" : "bg-black/15")}>
        <span className={cn("absolute top-0.5 size-6 rounded-full bg-white transition", value ? "left-5" : "left-0.5")} />
      </span>
    </button>
  );
}
