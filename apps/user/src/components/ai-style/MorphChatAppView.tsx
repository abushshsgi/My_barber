import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUp,
  Droplets,
  Gift,
  Grid3X3,
  Loader2,
  Menu,
  Mic,
  Plus,
  Scissors,
  Search,
  Settings,
  Smile,
  Sparkles,
  SquarePen,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatContentBlocks } from "@/components/ai-style/ChatContentBlocks";
import { ChatHairQuiz, type ChatHairAnswers } from "@/components/ai-style/ChatHairQuiz";
import { UserAvatar, userInitials } from "@/components/profile/UserAvatar";
import { useDisplayUser } from "@/hooks/use-me";
import type { ChatHairstyleCard } from "@/lib/api/ai";
import { readLastMorphContentRoute } from "@/lib/app-shell";
import { visualBlocks } from "@/lib/chat-blocks";
import { cn } from "@/lib/utils";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  hairstyles?: ChatHairstyleCard[];
  blocks?: import("@/lib/api/ai").ChatContentBlock[];
};

type Thread = {
  id: string;
  title: string;
  messages: ChatMsg[];
};

const QUICK = [
  { id: "faceShape", icon: Smile },
  { id: "stylePick", icon: Sparkles },
  { id: "beardStyle", icon: UserRound },
  { id: "careRoutine", icon: Droplets },
  { id: "productTips", icon: Gift },
  { id: "barberVisit", icon: Scissors },
] as const;

type Props = {
  chatOpen: boolean;
  messages: ChatMsg[];
  threads: Thread[];
  activeThreadId: string;
  input: string;
  sending: boolean;
  chatLocked: boolean;
  hairLoading: boolean;
  hairDraft: string | null;
  sendError: string | null;
  limitWarning: string | null;
  onInput: (value: string) => void;
  onSend: (text?: string) => void;
  onQuick: (text: string) => void;
  onRetry: () => void;
  onDismissError: () => void;
  onDismissLimit: () => void;
  onOpenLimit: () => void;
  onNewChat: () => void;
  onOpenThread: (id: string) => void;
  onOpenSettings: () => void;
  onHairSaved: (answers: ChatHairAnswers) => void | Promise<void>;
};

export function MorphChatAppView({
  chatOpen,
  messages,
  threads,
  activeThreadId,
  input,
  sending,
  chatLocked,
  hairLoading,
  hairDraft,
  sendError,
  limitWarning,
  onInput,
  onSend,
  onQuick,
  onRetry,
  onDismissError,
  onDismissLimit,
  onOpenLimit,
  onNewChat,
  onOpenThread,
  onOpenSettings,
  onHairSaved,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useDisplayUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const prompts = useMemo(
    () =>
      QUICK.map((item) => ({
        ...item,
        label: t(`aiStylePage.chat.quick.${item.id}`),
        text: t(`aiStylePage.chat.prompts.${item.id}`),
      })),
    [t],
  );

  const leave = () => {
    const to = readLastMorphContentRoute();
    void navigate({ to: (to === "/ai-style/chat" ? "/ai-style" : to) as never });
  };

  const openStyle = (item: ChatHairstyleCard) => {
    void navigate({ to: "/explore/$styleId/try", params: { styleId: item.id } });
  };

  const threadTitle =
    threads.find((thread) => thread.id === activeThreadId)?.title || t("aiStylePage.chat.title");

  const recent = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = threads.filter((thread) =>
      thread.messages.some((message) => message.content.trim()),
    );
    if (!q) return rows.slice(0, 40);
    return rows.filter((thread) => {
      const preview = [...thread.messages].reverse().find((message) => message.content.trim())?.content || "";
      return `${thread.title} ${preview}`.toLowerCase().includes(q);
    });
  }, [query, threads]);

  const composer = (
    <div className="relative">
      <div className="flex min-h-11 items-center rounded-full border-2 border-[#111111] bg-white py-1 pr-1 pl-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
        <button
          type="button"
          aria-label={t("aiStylePage.chat.home.cameraA11y")}
          disabled={sending || chatLocked}
          onClick={() => void navigate({ to: "/ai-style" })}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-[#111111] disabled:opacity-40"
        >
          <Plus className="size-[18px]" strokeWidth={2.25} />
        </button>
        <textarea
          value={input}
          rows={1}
          maxLength={600}
          disabled={sending || chatLocked || Boolean(hairDraft)}
          placeholder={
            chatLocked ? t("aiStylePage.chat.tokenEmptyShort") : t("aiStylePage.chat.home.askAnything")
          }
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (chatLocked) onOpenLimit();
              else onSend();
            }
          }}
          className="max-h-16 min-h-6 flex-1 resize-none bg-transparent px-2 py-1 text-[15px] leading-5 text-[#111111] outline-none placeholder:text-[#737373] disabled:opacity-50"
        />
        {input.trim() || sending ? (
          <button
            type="button"
            aria-label={t("aiStylePage.chat.send")}
            disabled={sending || chatLocked || !input.trim()}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSend()}
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-[#111111] text-white disabled:bg-[#D4D4D8]"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" strokeWidth={2.5} />}
          </button>
        ) : (
          <button
            type="button"
            disabled
            aria-label={t("aiStylePage.chat.voiceSoon")}
            title={t("aiStylePage.chat.voiceSoon")}
            className="grid size-8 shrink-0 cursor-not-allowed place-items-center rounded-full bg-black/5 text-[#111111]/30"
          >
            <Mic className="size-4" strokeWidth={2.25} />
          </button>
        )}
      </div>
      {chatLocked ? (
        <button
          type="button"
          className="absolute inset-0 cursor-pointer rounded-full"
          aria-label={t("aiStylePage.chat.tokenEmptyCta")}
          onClick={onOpenLimit}
        />
      ) : null}
    </div>
  );

  const notice = sendError ? (
    <div className="mb-3 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">{t("aiStylePage.chat.errorTitle")}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#52525B]">{sendError}</p>
        </div>
        <button type="button" aria-label={t("common.close")} onClick={onDismissError} className="cursor-pointer text-[#71717A]">
          <X className="size-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 cursor-pointer rounded-full bg-[#111111] px-3 py-1.5 text-[12px] font-semibold text-white"
      >
        {t("aiStylePage.chat.errorRetry")}
      </button>
    </div>
  ) : chatLocked ? (
    <button
      type="button"
      onClick={onOpenLimit}
      className="mb-3 w-full cursor-pointer rounded-2xl bg-[#111111] px-3 py-3 text-left text-white"
    >
      <p className="text-[13px] font-semibold">{t("aiStylePage.chat.tokenEmptyCta")}</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-white/70">{t("aiStylePage.chat.tokenEmpty")}</p>
    </button>
  ) : limitWarning ? (
    <div className="mb-3 flex items-start gap-2 rounded-2xl border border-black/10 bg-white px-3 py-3 dark:border-white/15 dark:bg-[#141414]">
      <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-[var(--morph-muted,#737373)]">{limitWarning}</p>
      <button type="button" aria-label={t("common.close")} onClick={onDismissLimit} className="cursor-pointer">
        <X className="size-4" />
      </button>
    </div>
  ) : null;

  const menu = menuOpen ? (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" className="absolute inset-0 cursor-pointer bg-black/30" aria-label={t("common.close")} onClick={() => setMenuOpen(false)} />
      <div className="relative flex h-full w-[min(86vw,380px)] flex-col border-r border-black/10 bg-[#FAFAFA] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[#111111]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[18px] font-bold tracking-tight">{t("aiStylePage.chat.menu.brand")}</p>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={() => setMenuOpen(false)}
            className="grid size-9 cursor-pointer place-items-center rounded-full border border-black/10 bg-white"
          >
            <X className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            onNewChat();
            setMenuOpen(false);
          }}
          className="mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-[18px] border border-[#111111] bg-white px-4 py-3 text-[14px] font-semibold"
        >
          <SquarePen className="size-4" />
          {t("aiStylePage.chat.newChat")}
        </button>
        {searchOpen ? (
          <div className="mb-2 flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2.5">
            <Search className="size-4 text-[#737373]" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("aiStylePage.chat.menu.searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setQuery("");
              }}
              className="cursor-pointer"
            >
              <X className="size-4 text-[#737373]" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex cursor-pointer items-center gap-3 rounded-2xl px-2 py-3 text-[14px] font-medium"
          >
            <Search className="size-5" />
            {t("aiStylePage.chat.menu.search")}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            void navigate({ to: "/ai-style/history" });
          }}
          className="flex cursor-pointer items-center gap-3 rounded-2xl px-2 py-3 text-[14px] font-medium"
        >
          <Grid3X3 className="size-5" />
          {t("aiStylePage.chat.menu.library")}
        </button>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          <p className="px-2 text-[12px] font-semibold text-[#737373]">{t("aiStylePage.chat.menu.history")}</p>
          {recent.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-[#737373]">{t("aiStylePage.chat.historyEmpty")}</p>
          ) : (
            recent.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => {
                  onOpenThread(thread.id);
                  setMenuOpen(false);
                }}
                className={cn(
                  "mt-1 flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-2.5 text-left text-[13px]",
                  thread.id === activeThreadId ? "bg-white font-semibold" : "",
                )}
              >
                <span className="truncate">{thread.title}</span>
              </button>
            ))
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 border-t border-black/10 pt-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setMenuOpen(false);
              void navigate({ to: "/profile" });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setMenuOpen(false);
                void navigate({ to: "/profile" });
              }
            }}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
          >
            <UserAvatar name={user.name} src={user.avatar} size={36} />
            <span className="truncate text-[14px] font-medium">{user.name || userInitials(user.name)}</span>
          </div>
          <button
            type="button"
            aria-label={t("aiStylePage.chat.settings")}
            onClick={() => {
              setMenuOpen(false);
              onOpenSettings();
            }}
            className="grid size-10 cursor-pointer place-items-center rounded-full"
          >
            <Settings className="size-5" />
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (hairLoading) {
    return (
      <div className="grid h-dvh place-items-center bg-[var(--morph-bg,#FAFAFA)] text-[var(--morph-fg,#111111)] lg:h-[calc(100dvh-6rem)]">
        <Loader2 className="size-6 animate-spin opacity-40" />
      </div>
    );
  }

  if (!chatOpen) {
    return (
      <div className="flex h-dvh flex-col bg-[var(--morph-bg,#FAFAFA)] text-[var(--morph-fg,#111111)] lg:h-[calc(100dvh-6rem)]">
        <header className="flex items-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label={t("aiStylePage.chat.menu.openA11y")}
            onClick={() => setMenuOpen(true)}
            className="grid size-10 cursor-pointer place-items-center"
          >
            <Menu className="size-5" />
          </button>
          <span className="flex-1" />
          <button
            type="button"
            aria-label={t("aiStylePage.chat.home.backA11y")}
            onClick={leave}
            className="grid size-10 cursor-pointer place-items-center"
          >
            <ArrowRight className="size-5" />
          </button>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase dark:border-white/20">
            <Sparkles className="size-3" />
            Morf AI
          </span>
          <h1 className="max-w-[16rem] text-[22px] leading-7 font-bold tracking-tight">
            {t("aiStylePage.chat.home.headline")}
          </h1>
          <span className="mt-2 h-0.5 w-8 rounded-full bg-current" />
          <p className="mt-2 max-w-[18rem] text-[13px] leading-5 text-[var(--morph-muted,#737373)]">
            {t("aiStylePage.chat.home.subtitle")}
          </p>
        </div>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {notice}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {prompts.map((prompt) => {
              const Icon = prompt.icon;
              return (
                <button
                  key={prompt.id}
                  type="button"
                  disabled={sending || chatLocked}
                  onClick={() => onQuick(prompt.text)}
                  className="inline-flex max-w-[220px] shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl border border-black/10 bg-white px-3 py-2 text-[12.5px] font-medium disabled:opacity-45 dark:border-white/15 dark:bg-[#141414]"
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{prompt.label}</span>
                </button>
              );
            })}
          </div>
          {composer}
        </div>
        {menu}
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-[var(--morph-bg,#FAFAFA)] text-[var(--morph-fg,#111111)] lg:h-[calc(100dvh-6rem)]">
      <header className="relative flex items-center gap-1.5 border-b border-black/10 px-3 py-1 pt-[max(0.35rem,env(safe-area-inset-top))] dark:border-white/10">
        <button
          type="button"
          aria-label={t("aiStylePage.chat.menu.openA11y")}
          onClick={() => setMenuOpen(true)}
          className="grid size-10 cursor-pointer place-items-center"
        >
          <Menu className="size-5" />
        </button>
        <p className="pointer-events-none absolute inset-x-16 truncate text-center text-[15px] font-bold tracking-tight">
          {threadTitle}
        </p>
        <span className="flex-1" />
        <button
          type="button"
          aria-label={t("aiStylePage.chat.newChat")}
          onClick={onNewChat}
          className="grid size-10 cursor-pointer place-items-center"
        >
          <SquarePen className="size-[18px]" />
        </button>
        <button
          type="button"
          aria-label={t("aiStylePage.chat.home.backA11y")}
          onClick={leave}
          className="grid size-10 cursor-pointer place-items-center"
        >
          <ArrowRight className="size-5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        {messages.map((msg) => {
          if (msg.role === "assistant" && msg.id === "pending" && !msg.content && !msg.blocks?.length) {
            return (
              <div key={msg.id} className="px-4 py-2">
                <span className="inline-flex gap-1 rounded-full bg-black/5 px-3 py-2 dark:bg-white/10">
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:140ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:280ms]" />
                </span>
              </div>
            );
          }
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="mb-4 flex justify-end px-4">
                <p className="max-w-[82%] rounded-[22px] rounded-br-md border border-black/10 bg-white px-4 py-3 text-[14px] leading-5 dark:border-white/15 dark:bg-[#1C1C1C]">
                  {msg.content}
                </p>
              </div>
            );
          }
          const rendered = visualBlocks(msg.content, msg.blocks, msg.hairstyles);
          return (
            <div key={msg.id} className="mb-4 px-4 text-[14px] leading-5">
              {rendered.length ? (
                <ChatContentBlocks blocks={rendered} onOpenHairstyle={openStyle} />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          );
        })}
        {hairDraft ? <ChatHairQuiz draft={hairDraft} onSaved={onHairSaved} /> : null}
      </div>
      <div className="px-4 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {notice}
        {composer}
      </div>
      {menu}
    </div>
  );
}
