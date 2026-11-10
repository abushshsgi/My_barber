import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Loader2, Lock, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

import {
  fetchGirlModelBlobUrl,
  fetchGirlModelsStatus,
  generateGirlModel,
  likeGirlModel,
  publishGirlModel,
  type GirlModelItem,
  type GirlModelSlot,
} from "@/lib/api/girl-models";
import { readExploreGenSecret, saveExploreGenSecret } from "@/lib/api/explore-gen";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

type Search = { key?: string };

export const Route = createFileRoute("/dev/explore-gen/girls")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    key: typeof search.key === "string" ? search.key : undefined,
  }),
  head: () => ({ meta: [{ title: "Qiz modellar — Explore Gen" }] }),
  component: GirlModelsPage,
});

function GirlModelsPage() {
  const { key: urlKey } = Route.useSearch();
  const queryClient = useQueryClient();
  const isDev = import.meta.env.DEV;
  const [keyInput, setKeyInput] = useState("");
  const [unlocked, setUnlocked] = useState(isDev);
  const [lookId, setLookId] = useState("central-asian");
  const [promptExtra, setPromptExtra] = useState("");
  const [likedOnly, setLikedOnly] = useState(false);
  const [slotId, setSlotId] = useState("leyla");
  const [labelDraft, setLabelDraft] = useState("Leyla");

  useEffect(() => {
    if (urlKey) {
      saveExploreGenSecret(urlKey);
      setUnlocked(true);
    } else if (readExploreGenSecret()) {
      setUnlocked(true);
    }
  }, [urlKey]);

  const statusQuery = useQuery({
    queryKey: ["girl-models", unlocked, likedOnly],
    queryFn: () => fetchGirlModelsStatus({ likedOnly }),
    enabled: unlocked,
    retry: false,
  });

  const looks = statusQuery.data?.looks ?? [];
  const slots = statusQuery.data?.slots ?? [];
  const activeLook = looks.find((look) => look.id === lookId) ?? looks[0];

  useEffect(() => {
    if (!looks.length) return;
    if (!looks.some((look) => look.id === lookId)) setLookId(looks[0].id);
  }, [looks, lookId]);

  useEffect(() => {
    if (!activeLook || activeLook.id === "custom") return;
    setLabelDraft(activeLook.label);
  }, [activeLook]);

  const items = useMemo(() => statusQuery.data?.items ?? [], [statusQuery.data?.items]);

  const generateMutation = useMutation({
    mutationFn: generateGirlModel,
    onSuccess: (result) => {
      toast.success(`${result.item.look_label} yaratildi`);
      void queryClient.invalidateQueries({ queryKey: ["girl-models"] });
    },
    onError: (error: Error) => toast.error(error.message || "Generatsiya xato"),
  });

  const likeMutation = useMutation({
    mutationFn: likeGirlModel,
    onSuccess: (result) => {
      toast.success(result.item.liked ? "Yoqdi" : "Belgi olindi");
      void queryClient.invalidateQueries({ queryKey: ["girl-models"] });
    },
    onError: (error: Error) => toast.error(error.message || "Saqlanmadi"),
  });

  const publishMutation = useMutation({
    mutationFn: publishGirlModel,
    onSuccess: (result) => {
      toast.success(`${result.item.slot_label || "Model"} Explore qizlariga qo'yildi`);
      void queryClient.invalidateQueries({ queryKey: ["girl-models"] });
      void queryClient.invalidateQueries({ queryKey: ["explore-personas"] });
    },
    onError: (error: Error) => toast.error(error.message || "Joylashtirish xato"),
  });

  const handleUnlock = () => {
    if (!keyInput.trim()) return;
    saveExploreGenSecret(keyInput.trim());
    setUnlocked(true);
    void queryClient.invalidateQueries({ queryKey: ["girl-models"] });
  };

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Lock className="size-5 text-neutral-700" />
            <h1 className="text-lg font-bold">Qiz modellar</h1>
          </div>
          <p className="mt-3 text-sm text-neutral-600">
            Explore Gen kaliti bilan kiring (
            <code className="rounded bg-neutral-100 px-1">?key=...</code>).
          </p>
          <input
            type="password"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
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
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-700">
                Runware · qiz modellar
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">Explore qizlari</h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Qiyofani tanlang, Runware portret yasaydi. Yoqqanini Leyla, Sofia yoki Mila
                slotiga qo&apos;ying — u Explore dagi qizlar qatorida chiqadi.
              </p>
            </div>
            <Link
              to="/dev/explore-gen"
              search={(prev) => prev}
              className="rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              ← Soch turmaklari
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span
              className={cn(
                "rounded-full px-3 py-1 font-medium",
                configured ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900",
              )}
            >
              {configured ? statusQuery.data?.model || "Runware" : "RUNWARE_API_KEY yo'q"}
            </span>
            <span className="rounded-full bg-neutral-100 px-3 py-1">
              {statusQuery.data?.total ?? 0} ta model
            </span>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-800">
              Yoqqan: {statusQuery.data?.liked_count ?? 0}
            </span>
          </div>
        </div>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-neutral-500">
            Explore dagi qizlar
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {slots.map((slot) => (
              <SlotCard key={slot.id} slot={slot} active={slot.id === slotId} onPick={() => setSlotId(slot.id)} />
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-2">
            <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Qiyofa
            </p>
            {looks.map((look) => (
              <button
                key={look.id}
                type="button"
                onClick={() => setLookId(look.id)}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-left transition",
                  look.id === activeLook?.id
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white hover:border-neutral-400",
                )}
              >
                <div className="text-sm font-semibold">
                  {look.label}
                  <span className="ml-2 text-[11px] font-medium opacity-70">{look.code}</span>
                </div>
                <div
                  className={cn(
                    "mt-0.5 text-[11px]",
                    look.id === activeLook?.id ? "text-neutral-300" : "text-neutral-500",
                  )}
                >
                  {look.summary}
                </div>
              </button>
            ))}
          </aside>

          <div className="space-y-6">
            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {activeLook?.id === "custom" ? "Qiyofa tavsifi" : "Qo'shimcha yo'nalish"}
              </label>
              <textarea
                value={promptExtra}
                onChange={(event) => setPromptExtra(event.target.value)}
                rows={4}
                placeholder={
                  activeLook?.id === "custom"
                    ? "Masalan: young Central Asian woman age 24, warm beige skin, dark wavy hair..."
                    : "Ixtiyoriy: yuz ifodasi, soch uzunligi, yorug'lik..."
                }
                className="mt-2 w-full resize-y rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-900"
              />
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="min-w-[180px] flex-1">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                    Explore dagi nomi
                  </span>
                  <input
                    value={labelDraft}
                    onChange={(event) => setLabelDraft(event.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm"
                  />
                </label>
                <label className="min-w-[160px]">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                    Slot
                  </span>
                  <select
                    value={slotId}
                    onChange={(event) => setSlotId(event.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm"
                  >
                    {slots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.label}
                        {slot.published ? " · joylangan" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                disabled={generateMutation.isPending || !configured || !activeLook}
                onClick={() => {
                  if (!activeLook) return;
                  generateMutation.mutate({ lookId: activeLook.id, promptExtra });
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wand2 className="size-4" />
                )}
                Runware da yasash
              </button>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Yaratilgan modellar</h2>
                  <p className="text-sm text-neutral-600">
                    Yurak — yoqdi. Keyin shu rasmni tanlangan slotga qo&apos;ying.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={likedOnly}
                    onChange={(event) => setLikedOnly(event.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  Faqat yoqqanlar
                </label>
              </div>

              {statusQuery.isLoading ? (
                <p className="mt-6 text-sm text-neutral-500">Yuklanmoqda…</p>
              ) : statusQuery.isError ? (
                <p className="mt-6 text-sm text-red-700">
                  {(statusQuery.error as Error).message || "Ro'yxat yuklanmadi"}
                </p>
              ) : items.length === 0 ? (
                <div className="mt-8 flex flex-col items-center gap-2 py-10 text-center text-neutral-500">
                  <Sparkles className="size-8 opacity-40" />
                  <p className="text-sm">Hali model yo&apos;q. Qiyofani tanlab yasang.</p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <ModelCard
                      key={item.id}
                      item={item}
                      slots={slots}
                      publishing={publishMutation.isPending}
                      onToggleLike={() =>
                        likeMutation.mutate({ id: item.id, liked: !item.liked })
                      }
                      onPublish={() =>
                        publishMutation.mutate({
                          id: item.id,
                          personaId: slotId,
                          label: labelDraft.trim() || item.look_label,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotCard({
  slot,
  active,
  onPick,
}: {
  slot: GirlModelSlot;
  active: boolean;
  onPick: () => void;
}) {
  const src = slot.live_url ? resolveMediaUrl(slot.live_url) : null;
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3 text-left",
        active ? "border-rose-500 bg-rose-50" : "border-neutral-200 bg-neutral-50",
      )}
    >
      <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-200">
        {src ? (
          <img src={src} alt="" className="size-full object-cover object-top" />
        ) : (
          <span className="text-[10px] font-bold text-neutral-500">bo&apos;sh</span>
        )}
      </span>
      <span>
        <span className="block text-sm font-semibold">{slot.label}</span>
        <span className="block text-[11px] text-neutral-500">
          {slot.code}
          {slot.published ? " · Explore da" : " · hali yo'q"}
        </span>
      </span>
    </button>
  );
}

function ModelCard({
  item,
  slots,
  publishing,
  onToggleLike,
  onPublish,
}: {
  item: GirlModelItem;
  slots: GirlModelSlot[];
  publishing: boolean;
  onToggleLike: () => void;
  onPublish: () => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const published = slots.find((slot) => slot.id === item.published_persona_id);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    setFailed(false);
    setBlobUrl(null);
    void fetchGirlModelBlobUrl(item)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        revoked = url;
        setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [item]);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-neutral-50",
        item.liked ? "border-rose-400" : "border-neutral-200",
      )}
    >
      <div className="relative aspect-[3/4] bg-neutral-200">
        {blobUrl ? (
          <img src={blobUrl} alt={item.look_label} className="absolute inset-0 size-full object-cover object-top" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-xs text-neutral-500">
            {failed ? "Rasm yo'q" : <Loader2 className="size-5 animate-spin" />}
          </div>
        )}
        {published ? (
          <span className="absolute left-2 top-2 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-bold text-white">
            {published.label}
          </span>
        ) : null}
      </div>
      <div className="space-y-2 p-3">
        <p className="text-sm font-semibold">{item.look_label}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleLike}
            className={cn(
              "inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold",
              item.liked ? "bg-rose-100 text-rose-900" : "bg-white text-neutral-800 ring-1 ring-neutral-200",
            )}
          >
            <Heart className={cn("size-3.5", item.liked && "fill-rose-600 text-rose-600")} />
            {item.liked ? "Yoqdi" : "Yoqdi deb belgilash"}
          </button>
          <button
            type="button"
            disabled={publishing}
            onClick={onPublish}
            className="rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Explore qizlarga
          </button>
        </div>
      </div>
    </article>
  );
}
