import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Download,
  ImageIcon,
  Loader2,
  Lock,
  Sparkles,
  Star,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import {
  downloadAssetsStudioItem,
  fetchAssetsStudioStatus,
  generateAssetsStudioItem,
  resolveAssetsStudioImageUrl,
  selectAssetsStudioItem,
  type AssetsStudioTemplate,
} from "@/lib/api/assets-studio";
import {
  readExploreGenSecret,
  saveExploreGenSecret,
} from "@/lib/api/explore-gen";
import { cn } from "@/lib/utils";

type Search = { key?: string };

export const Route = createFileRoute("/dev/explore-gen/assets")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    key: typeof search.key === "string" ? search.key : undefined,
  }),
  head: () => ({ meta: [{ title: "Assets Studio — Explore Gen" }] }),
  component: AssetsStudioPage,
});

function AssetsStudioPage() {
  const { key: urlKey } = Route.useSearch();
  const queryClient = useQueryClient();
  const isDev = import.meta.env.DEV;
  const [keyInput, setKeyInput] = useState("");
  const [unlocked, setUnlocked] = useState(isDev);
  const [templateId, setTemplateId] = useState("logo_user");
  const [promptExtra, setPromptExtra] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  useEffect(() => {
    if (urlKey) {
      saveExploreGenSecret(urlKey);
      setUnlocked(true);
    } else if (readExploreGenSecret()) {
      setUnlocked(true);
    }
  }, [urlKey]);

  const statusQuery = useQuery({
    queryKey: ["assets-studio", unlocked, showSelectedOnly],
    queryFn: () =>
      fetchAssetsStudioStatus({
        selectedOnly: showSelectedOnly,
      }),
    enabled: unlocked,
    refetchInterval: 60_000,
    retry: false,
  });

  const templates = statusQuery.data?.templates ?? [];
  const activeTemplate: AssetsStudioTemplate | undefined =
    templates.find((t) => t.id === templateId) ?? templates[0];

  useEffect(() => {
    if (!templates.length) return;
    if (!templates.some((t) => t.id === templateId)) {
      setTemplateId(templates[0].id);
    }
  }, [templates, templateId]);

  const items = useMemo(() => {
    const all = statusQuery.data?.items ?? [];
    if (!activeTemplate) return all;
    return all.filter((item) => item.template_id === activeTemplate.id);
  }, [statusQuery.data?.items, activeTemplate]);

  const generateMutation = useMutation({
    mutationFn: generateAssetsStudioItem,
    onSuccess: (result) => {
      toast.success(`${result.item.template_label} yaratildi`);
      void queryClient.invalidateQueries({ queryKey: ["assets-studio"] });
    },
    onError: (error: Error) => toast.error(error.message || "Generatsiya xato"),
  });

  const selectMutation = useMutation({
    mutationFn: selectAssetsStudioItem,
    onSuccess: (result) => {
      toast.success(result.item.selected ? "Sayt uchun tanlandi" : "Tanlov bekor qilindi");
      void queryClient.invalidateQueries({ queryKey: ["assets-studio"] });
    },
    onError: (error: Error) => toast.error(error.message || "Tanlash xato"),
  });

  const handleUnlock = () => {
    if (!keyInput.trim()) return;
    saveExploreGenSecret(keyInput.trim());
    setUnlocked(true);
    void queryClient.invalidateQueries({ queryKey: ["assets-studio"] });
  };

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Lock className="size-5 text-neutral-700" />
            <h1 className="text-lg font-bold">Assets Studio</h1>
          </div>
          <p className="mt-3 text-sm text-neutral-600">
            Explore Gen kaliti bilan kiring (
            <code className="rounded bg-neutral-100 px-1">?key=...</code>).
          </p>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="EXPLORE_GEN_SECRET"
            className="mt-4 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm"
          />
          <button
            type="button"
            onClick={handleUnlock}
            className="mt-3 w-full rounded-2xl bg-neutral-900 py-3 text-sm font-semibold text-white"
          >
            Kirish
          </button>
        </div>
      </div>
    );
  }

  const configured = statusQuery.data?.configured;

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">
                Explore Gen · Assets
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">Assets Studio</h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                User / Partner logolari, home bannerlar va boshqa marketing rasmlar uchun tayyor
                shablonlar. Yaratilganlarni tanlab yuklab oling va saytga qo&apos;ying.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/dev/explore-gen"
                search={(prev) => prev}
                className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
              >
                ← Explore uslublar
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-600">
            <span
              className={cn(
                "rounded-full px-3 py-1 font-medium",
                configured?.image_generation ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900",
              )}
            >
              AI: {configured?.provider ?? "sozlanmagan"}
            </span>
            <span className="rounded-full bg-neutral-100 px-3 py-1">
              Kutubxona: {statusQuery.data?.total ?? 0}
            </span>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-800">
              Tanlangan: {statusQuery.data?.selected_count ?? 0}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-2">
            <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Shablonlar
            </p>
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTemplateId(t.id);
                  setPromptExtra("");
                }}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-left transition",
                  t.id === activeTemplate?.id
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white hover:border-neutral-400",
                )}
              >
                <div className="text-sm font-semibold">{t.label}</div>
                <div
                  className={cn(
                    "mt-0.5 text-[11px]",
                    t.id === activeTemplate?.id ? "text-neutral-300" : "text-neutral-500",
                  )}
                >
                  {t.aspect_ratio} · {t.audience} · {t.category}
                </div>
              </button>
            ))}
          </aside>

          <div className="space-y-6">
            {activeTemplate ? (
              <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{activeTemplate.label}</h2>
                    <p className="mt-1 text-sm text-neutral-600">{activeTemplate.description}</p>
                    <p className="mt-2 text-xs text-neutral-500">
                      {activeTemplate.width}×{activeTemplate.height} ·{" "}
                      {activeTemplate.suggested_use}
                    </p>
                  </div>
                  <Sparkles className="size-5 text-violet-600" />
                </div>

                <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Qo&apos;shimcha yo&apos;riqnoma (ixtiyoriy)
                </label>
                <textarea
                  value={promptExtra}
                  onChange={(e) => setPromptExtra(e.target.value)}
                  rows={4}
                  placeholder={
                    activeTemplate.id === "custom"
                      ? "Bu yerga to'liq prompt yozing…"
                      : "Masalan: yashil aksent, minimal, matnsiz…"
                  }
                  className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                />

                <details className="mt-3 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                  <summary className="cursor-pointer text-xs font-semibold text-neutral-600">
                    Asosiy shablon promptini ko&apos;rish
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-neutral-600">
                    {activeTemplate.default_prompt}
                  </pre>
                </details>

                <button
                  type="button"
                  disabled={generateMutation.isPending || !configured?.image_generation}
                  onClick={() =>
                    generateMutation.mutate({
                      templateId: activeTemplate.id,
                      promptExtra,
                    })
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Wand2 className="size-4" />
                  )}
                  Generatsiya qilish
                </button>
              </section>
            ) : null}

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Yaratilgan rasmlar</h2>
                  <p className="text-sm text-neutral-600">
                    Tanlanganlar keyin saytga qo&apos;yish uchun saqlanadi — yuklab oling.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={showSelectedOnly}
                    onChange={(e) => setShowSelectedOnly(e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  Faqat tanlanganlar
                </label>
              </div>

              {statusQuery.isLoading ? (
                <p className="mt-6 text-sm text-neutral-500">Yuklanmoqda…</p>
              ) : items.length === 0 ? (
                <div className="mt-8 flex flex-col items-center gap-2 py-10 text-center text-neutral-500">
                  <ImageIcon className="size-8 opacity-40" />
                  <p className="text-sm">Hali rasm yo&apos;q — shablonni tanlab generatsiya qiling.</p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => {
                    const src = resolveAssetsStudioImageUrl(item);
                    return (
                      <article
                        key={item.id}
                        className={cn(
                          "overflow-hidden rounded-2xl border bg-neutral-50",
                          item.selected ? "border-violet-500 ring-2 ring-violet-200" : "border-neutral-200",
                        )}
                      >
                        <div
                          className="relative bg-neutral-200"
                          style={{
                            aspectRatio: item.aspect_ratio.replace(":", " / "),
                          }}
                        >
                          {src ? (
                            <img
                              src={src}
                              alt={item.template_label}
                              className="absolute inset-0 size-full object-cover"
                            />
                          ) : null}
                          {item.selected ? (
                            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              <Star className="size-3 fill-white" />
                              Tanlangan
                            </span>
                          ) : null}
                        </div>
                        <div className="space-y-2 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">{item.template_label}</p>
                              <p className="text-[11px] text-neutral-500">
                                {new Date(item.created_at).toLocaleString()} · {item.width}×
                                {item.height}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={selectMutation.isPending}
                              onClick={() =>
                                selectMutation.mutate({
                                  id: item.id,
                                  selected: !item.selected,
                                })
                              }
                              className={cn(
                                "inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold",
                                item.selected
                                  ? "bg-violet-100 text-violet-900"
                                  : "bg-neutral-900 text-white",
                              )}
                            >
                              <Check className="size-3.5" />
                              {item.selected ? "Bekor qilish" : "Sayt uchun tanlash"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                downloadAssetsStudioItem(item).catch((e: Error) =>
                                  toast.error(e.message),
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold"
                            >
                              <Download className="size-3.5" />
                              Yuklab olish
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
