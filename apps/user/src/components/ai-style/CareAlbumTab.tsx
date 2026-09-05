import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toPng } from "html-to-image";
import { Camera, Download, ImagePlus, Instagram, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  fetchAiStyleHistory,
  generateCareProgressStory,
  saveAiStyleHistory,
  type CareProgressStoryResult,
} from "@/lib/api/ai";
import { fetchCareShelf } from "@/lib/api/care-products";
import { authQueryEnabled } from "@/lib/auth-query";
import { downloadImageFile, imageUrlToFile } from "@/lib/ai-style-image";
import { getActiveUserId } from "@/lib/face-profile";
import { toShareImageSource } from "@/lib/media-url";
import { cn } from "@/lib/utils";

type ProductOption = {
  id: string;
  name: string;
};

type CareAlbumTabProps = {
  fallbackProducts: ProductOption[];
  goalHint: string;
};

type AlbumEntry = {
  id: string;
  imageUrl: string;
  takenAt: Date;
};

type AlbumMetaItem = {
  product_ids: string[];
  product_names: string[];
  goal?: string;
};

type AlbumMeta = Record<string, AlbumMetaItem>;

const DAY_MS = 24 * 60 * 60 * 1000;
const META_KEY_PREFIX = "mysaloon.care.album.meta";
const ALBUM_QUERY_KEY = ["ai", "care", "album", "history"] as const;
const SHELF_QUERY_KEY = ["ai", "care", "shelf"] as const;

function dayDiff(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / DAY_MS));
}

function keyForMeta(userId: number | null): string {
  return `${META_KEY_PREFIX}:${userId ?? "guest"}`;
}

function readAlbumMeta(userId: number | null): AlbumMeta {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(keyForMeta(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AlbumMeta;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveAlbumMeta(userId: number | null, meta: AlbumMeta) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(keyForMeta(userId), JSON.stringify(meta));
  } catch {
    /* noop */
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Rasm o'qilmadi"));
    reader.readAsDataURL(file);
  });
}

export function CareAlbumTab({ fallbackProducts, goalHint }: CareAlbumTabProps) {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const storyRef = useRef<HTMLDivElement | null>(null);
  const userId = getActiveUserId();

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [albumMeta, setAlbumMeta] = useState<AlbumMeta>({});
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyData, setStoryData] = useState<CareProgressStoryResult | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);

  useEffect(() => {
    setAlbumMeta(readAlbumMeta(userId));
  }, [userId]);

  const albumQ = useQuery({
    queryKey: ALBUM_QUERY_KEY,
    queryFn: fetchAiStyleHistory,
    enabled: authQueryEnabled(),
    staleTime: 30_000,
  });

  const shelfQ = useQuery({
    queryKey: SHELF_QUERY_KEY,
    queryFn: fetchCareShelf,
    enabled: authQueryEnabled(),
    staleTime: 60_000,
  });

  const savePhotoMutation = useMutation({
    mutationFn: saveAiStyleHistory,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ALBUM_QUERY_KEY });
    },
  });

  const storyAiMutation = useMutation({
    mutationFn: generateCareProgressStory,
    onSuccess: (data) => {
      setStoryData(data);
      setStoryError(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "";
      setStoryError(
        message ||
          t("aiStylePage.care.album.story.aiError", {
            defaultValue: "AI xulosani tayyorlab bo'lmadi.",
          }),
      );
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (mode: "share" | "save") => {
      if (!storyRef.current) throw new Error("Story topilmadi.");
      const png = await toPng(storyRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#0b0b0f",
      });

      if (mode === "save") {
        await downloadImageFile(png, "mysaloon-care-story.png");
        return;
      }

      const file = await imageUrlToFile(png, "mysaloon-care-story.png");
      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }));

      if (canShareFiles) {
        await navigator.share({
          files: [file],
          title: "MySaloon x Morf AI",
          text: "Parvarish natijam",
        });
        return;
      }
      await downloadImageFile(png, "mysaloon-care-story.png");
    },
  });

  const productOptions = useMemo(() => {
    const byName = new Map<string, ProductOption>();
    for (const item of shelfQ.data?.items || []) {
      const name = [item.brand, item.name].filter(Boolean).join(" · ").trim() || item.name;
      if (!name) continue;
      const key = `shelf:${item.product_id ?? item.id}`;
      byName.set(name.toLowerCase(), { id: key, name });
    }
    for (const item of fallbackProducts) {
      if (!item.name) continue;
      if (!byName.has(item.name.toLowerCase())) {
        byName.set(item.name.toLowerCase(), item);
      }
    }
    return Array.from(byName.values()).slice(0, 12);
  }, [fallbackProducts, shelfQ.data?.items]);

  const entries = useMemo<AlbumEntry[]>(() => {
    return (albumQ.data || [])
      .filter((row) => Boolean(row.photo_url))
      .map((row) => ({
        id: String(row.id),
        imageUrl: toShareImageSource(row.photo_url || ""),
        takenAt: new Date(row.scanned_at),
      }))
      .filter((row) => row.imageUrl && !Number.isNaN(row.takenAt.getTime()))
      .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  }, [albumQ.data]);

  const groupedEntries = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language || "uz", {
      day: "numeric",
      month: "long",
    });
    const groups: Array<{ key: string; label: string; items: AlbumEntry[] }> = [];
    for (const entry of entries) {
      const key = entry.takenAt.toISOString().slice(0, 10);
      const label = fmt.format(entry.takenAt);
      const last = groups[groups.length - 1];
      if (last && last.key === key) {
        last.items.push(entry);
      } else {
        groups.push({ key, label, items: [entry] });
      }
    }
    return groups;
  }, [entries, i18n.language]);

  const journey = useMemo(() => {
    if (entries.length < 2) return null;
    const before = entries[0];
    const after = entries[entries.length - 1];
    const days = dayDiff(before.takenAt, after.takenAt);
    if (days < 7) return null;
    return { before, after, days };
  }, [entries]);

  const durationDays = useMemo(() => {
    if (entries.length < 2) return entries.length > 0 ? 1 : 0;
    return Math.max(1, dayDiff(entries[0].takenAt, entries[entries.length - 1].takenAt));
  }, [entries]);

  const journeyProducts = useMemo(() => {
    if (!journey) return [];
    const start = journey.before.takenAt.getTime();
    const end = journey.after.takenAt.getTime();
    const unique = new Set<string>();
    for (const entry of entries) {
      const ts = entry.takenAt.getTime();
      if (ts < start || ts > end) continue;
      for (const label of albumMeta[entry.id]?.product_names || []) {
        if (label?.trim()) unique.add(label.trim());
      }
    }
    return Array.from(unique).slice(0, 6);
  }, [albumMeta, entries, journey]);

  const perPhotoProductNames = (entryId: string) => {
    const names = albumMeta[entryId]?.product_names || [];
    return names.filter(Boolean).slice(0, 2);
  };

  const selectedNames = useMemo(
    () =>
      selectedProductIds
        .map((id) => productOptions.find((row) => row.id === id)?.name || "")
        .filter(Boolean)
        .slice(0, 4),
    [productOptions, selectedProductIds],
  );

  const triggerGenerateStory = async () => {
    if (!journey) return;
    await storyAiMutation.mutateAsync({
      days_count: journey.days,
      products_list: journeyProducts.length ? journeyProducts : selectedNames,
      user_goal: goalHint,
    });
  };

  const onOpenStory = () => {
    if (!journey) return;
    setStoryOpen(true);
    if (!storyData && !storyAiMutation.isPending) {
      void triggerGenerateStory();
    }
  };

  const onPickPhoto: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(
        t("aiStylePage.care.album.upload.invalid", {
          defaultValue: "Faqat rasm yuklash mumkin.",
        }),
      );
      return;
    }
    try {
      const image = await fileToDataUrl(file);
      const saved = await savePhotoMutation.mutateAsync({
        image,
        source: "gallery",
      });
      const product_names = selectedNames;
      const nextMeta: AlbumMeta = {
        ...albumMeta,
        [String(saved.id)]: {
          product_ids: selectedProductIds.slice(0, 8),
          product_names,
          goal: goalHint,
        },
      };
      setAlbumMeta(nextMeta);
      saveAlbumMeta(userId, nextMeta);
      toast.success(
        t("aiStylePage.care.album.upload.success", {
          defaultValue: "Parvarish albomiga rasm qo'shildi.",
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(
        message ||
          t("aiStylePage.care.album.upload.failed", {
            defaultValue: "Rasmni yuklab bo'lmadi. Qayta urinib ko'ring.",
          }),
      );
    }
  };

  const onToggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onShareStory = async () => {
    try {
      await exportMutation.mutateAsync("share");
      toast.success(
        t("aiStylePage.care.album.story.shareReady", {
          defaultValue: "Story ulashishga tayyor.",
        }),
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(
        t("aiStylePage.care.album.story.shareError", {
          defaultValue: "Story ulashib bo'lmadi.",
        }),
      );
    }
  };

  const onSaveStory = async () => {
    try {
      await exportMutation.mutateAsync("save");
      toast.success(
        t("aiStylePage.care.album.story.saved", {
          defaultValue: "Story galereyaga saqlandi.",
        }),
      );
    } catch {
      toast.error(
        t("aiStylePage.care.album.story.saveError", {
          defaultValue: "Story saqlanmadi.",
        }),
      );
    }
  };

  if (albumQ.isLoading) {
    return (
      <div className="mt-6 space-y-3">
        <div className="h-20 animate-pulse rounded-3xl bg-white" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-36 animate-pulse rounded-2xl bg-white" />
          <div className="h-36 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="mt-6 pb-20">
        <p className="text-[12px] font-medium tracking-wide text-[#111111]/35">
          {t("aiStylePage.care.album.badge", { defaultValue: "Parvarish Albomi" })}
        </p>
        <h2 className="mt-1.5 text-[1.55rem] font-semibold leading-tight tracking-tight">
          {t("aiStylePage.care.album.title", { defaultValue: "Mening Parvarish Albomim" })}
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white px-3.5 py-3">
            <p className="text-[12px] text-[#111111]/45">
              📸 {t("aiStylePage.care.album.metrics.total", { defaultValue: "Jami rasmlar" })}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{entries.length}</p>
          </div>
          <div className="rounded-2xl bg-white px-3.5 py-3">
            <p className="text-[12px] text-[#111111]/45">
              🗓️ {t("aiStylePage.care.album.metrics.duration", { defaultValue: "Davomiylik" })}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {durationDays > 0
                ? t("aiStylePage.care.album.metrics.durationValue", {
                    defaultValue: "{{count}} kundan beri",
                    count: durationDays,
                  })
                : t("aiStylePage.care.album.metrics.notStarted", {
                    defaultValue: "Hali boshlanmagan",
                  })}
            </p>
          </div>
        </div>

        {journey ? (
          <button
            type="button"
            onClick={onOpenStory}
            className="mt-4 w-full cursor-pointer rounded-3xl bg-gradient-to-r from-[#6E56CF] via-[#7B5FFF] to-[#3B82F6] px-4 py-4 text-left text-white shadow-[0_10px_28px_-10px_rgba(59,130,246,0.65)] transition-transform active:scale-[0.99]"
          >
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-white/75">
              {t("aiStylePage.care.album.resultReady", { defaultValue: "Natija tayyor" })}
            </p>
            <p className="mt-1 text-[17px] font-semibold leading-tight">
              {journey.days >= 30
                ? t("aiStylePage.care.album.monthlyReady", {
                    defaultValue: "1 Oylik AI Before & After Reelingiz!",
                  })
                : t("aiStylePage.care.album.weeklyReady", {
                    defaultValue: "7 Kunlik Natijangiz Tayyor!",
                  })}
            </p>
            <p className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-white/85">
              <Sparkles className="size-3.5" />
              {t("aiStylePage.care.album.viewAndShare", {
                defaultValue: "Natijani Ko'rish va Ulashish",
              })}
            </p>
          </button>
        ) : (
          <div className="mt-4 rounded-2xl border border-black/10 bg-white px-3.5 py-3 text-[13px] text-[#111111]/65">
            {t("aiStylePage.care.album.helper", {
              defaultValue: "Kamida 2 ta rasm va 7 kunlik farq bo'lsa AI natija ochiladi.",
            })}
          </div>
        )}

        {productOptions.length > 0 ? (
          <div className="mt-5">
            <p className="text-[12px] font-medium tracking-wide text-[#111111]/35">
              {t("aiStylePage.care.album.productsForToday", {
                defaultValue: "Bugun ishlatilgan mahsulotlar",
              })}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {productOptions.map((item) => {
                const active = selectedProductIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggleProduct(item.id)}
                    className={cn(
                      "cursor-pointer rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                      active ? "bg-[#111111] text-white" : "bg-white text-[#111111]/65",
                    )}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {groupedEntries.length ? (
            groupedEntries.map((group, groupIndex) => (
              <div key={group.key}>
                <p className="mb-2 text-[12px] font-medium tracking-wide text-[#111111]/35">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((entry, index) => (
                    <motion.article
                      key={entry.id}
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: groupIndex * 0.02 + index * 0.03 }}
                      className="overflow-hidden rounded-2xl bg-white"
                    >
                      <div className="relative aspect-[3/4]">
                        <img
                          src={entry.imageUrl}
                          alt=""
                          className="h-full w-full object-cover object-top"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2.5 pt-6">
                          <p className="text-[11px] font-medium text-white/85">
                            {new Intl.DateTimeFormat(i18n.language || "uz", {
                              day: "2-digit",
                              month: "short",
                            }).format(entry.takenAt)}
                          </p>
                        </div>
                      </div>
                      <div className="px-2.5 py-2">
                        <div className="flex min-h-9 flex-wrap gap-1">
                          {perPhotoProductNames(entry.id).length ? (
                            perPhotoProductNames(entry.id).map((label) => (
                              <span
                                key={`${entry.id}:${label}`}
                                className="rounded-full bg-[#F3F3F3] px-2 py-1 text-[10px] text-[#111111]/70"
                              >
                                {label}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-[#111111]/40">
                              {t("aiStylePage.care.album.noProducts", {
                                defaultValue: "Mahsulot belgilanmagan",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="grid place-items-center rounded-3xl border border-dashed border-black/15 bg-white px-4 py-10 text-center">
              <ImagePlus className="size-5 text-[#111111]/40" />
              <p className="mt-2 text-sm font-medium text-[#111111]/70">
                {t("aiStylePage.care.album.emptyTitle", {
                  defaultValue: "Parvarish albomingiz hali bo'sh.",
                })}
              </p>
              <p className="mt-1 text-[13px] text-[#111111]/45">
                {t("aiStylePage.care.album.emptySub", {
                  defaultValue: "Har hafta rasm qo'shib, progressni kuzating.",
                })}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={savePhotoMutation.isPending}
          className="fixed bottom-[max(6.2rem,calc(env(safe-area-inset-bottom)+5.5rem))] right-5 z-20 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#111111] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_14px_36px_-18px_rgba(0,0,0,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savePhotoMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" />
          )}
          {t("aiStylePage.care.album.addPhoto", { defaultValue: "Yangi rasm qo'shish" })}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickPhoto}
        />
      </section>

      <AnimatePresence>
        {storyOpen && journey ? (
          <motion.div
            className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 px-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="absolute inset-0"
              onClick={() => setStoryOpen(false)}
              aria-label={t("common.close", { defaultValue: "Yopish" })}
            />

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.28 }}
              className="relative z-[1] flex h-[96dvh] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-[#0B0B0F] text-white"
            >
              <div className="flex items-center justify-between px-4 pb-2 pt-3">
                <p className="text-sm font-semibold">
                  {t("aiStylePage.care.album.story.modalTitle", {
                    defaultValue: "Before & After Story",
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => setStoryOpen(false)}
                  className="grid size-9 place-items-center rounded-full bg-white/10"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div
                  ref={storyRef}
                  className="relative mx-auto w-full max-w-[392px] overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-[#161628] via-[#111118] to-[#0C0C12] aspect-[9/16]"
                >
                  <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
                  <div className="absolute inset-0 p-3.5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold">
                      <img
                        src="/brand-logo.png"
                        alt="MySaloon"
                        className="h-3.5 w-3.5 rounded-full"
                      />
                      MySaloon x Morf AI
                    </div>
                    <div className="mt-2 inline-flex rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] text-white/80">
                      {storyData?.progress_headline ||
                        t("aiStylePage.care.album.story.progressTag", {
                          defaultValue: "{{count}} Kunlik Soch Parvarishi Natijasi",
                          count: journey.days,
                        })}
                    </div>

                    <div className="mt-3 grid h-[52%] grid-cols-2 gap-2">
                      <StoryFrame
                        label={t("aiStylePage.care.album.story.before", { defaultValue: "OLDIN" })}
                        date={journey.before.takenAt}
                        imageUrl={journey.before.imageUrl}
                        locale={i18n.language || "uz"}
                      />
                      <StoryFrame
                        label={t("aiStylePage.care.album.story.after", { defaultValue: "KEYIN" })}
                        date={journey.after.takenAt}
                        imageUrl={journey.after.imageUrl}
                        locale={i18n.language || "uz"}
                      />
                    </div>

                    <div className="mt-3 rounded-2xl border border-white/12 bg-black/35 px-3 py-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">
                        {t("aiStylePage.care.album.story.products", {
                          defaultValue: "Care Routine",
                        })}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(journeyProducts.length ? journeyProducts : selectedNames)
                          .slice(0, 3)
                          .map((product) => (
                            <span
                              key={product}
                              className="rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[11px]"
                            >
                              {product}
                            </span>
                          ))}
                      </div>
                    </div>

                    <div className="mt-2 rounded-2xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/15 px-3 py-2.5">
                      {storyAiMutation.isPending ? (
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-28 animate-pulse rounded-full bg-white/20" />
                          <div className="h-3 w-full animate-pulse rounded-full bg-white/15" />
                        </div>
                      ) : storyError ? (
                        <div>
                          <p className="text-[12px] text-white/90">{storyError}</p>
                          <button
                            type="button"
                            onClick={() => void triggerGenerateStory()}
                            className="mt-2 inline-flex h-8 items-center rounded-full bg-white/15 px-3 text-[12px] font-semibold"
                          >
                            {t("common.retry", { defaultValue: "Qayta urinish" })}
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-[11px] font-semibold text-[#C4B5FD]">
                            {storyData?.growth_tag || "+15% Zichlik"}
                          </p>
                          <p className="mt-1 text-[12px] leading-snug text-white/90">
                            {storyData?.ai_verdict ||
                              t("aiStylePage.care.album.story.verdictFallback", {
                                defaultValue:
                                  "Sochdagi ijobiy o'zgarishlar sezilarli darajada yaxshilandi.",
                              })}
                          </p>
                        </>
                      )}
                    </div>

                    <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                      MySaloon.uz
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => void onShareStory()}
                    disabled={exportMutation.isPending}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#2563EB] px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {exportMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Instagram className="size-4" />
                    )}
                    {t("aiStylePage.care.album.story.share", {
                      defaultValue: "Instagram Story-ga joylash",
                    })}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onSaveStory()}
                    disabled={exportMutation.isPending}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <Download className="size-4" />
                    {t("aiStylePage.care.album.story.save", {
                      defaultValue: "Galereyaga saqlash",
                    })}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function StoryFrame({
  label,
  date,
  imageUrl,
  locale,
}: {
  label: string;
  date: Date;
  imageUrl: string;
  locale: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/25">
      <img src={imageUrl} alt="" className="h-full w-full object-cover object-top" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="absolute inset-x-2.5 bottom-2.5">
        <p className="text-[10px] font-semibold tracking-[0.1em] text-white/80">{label}</p>
        <p className="mt-0.5 text-[11px] text-white/75">
          {new Intl.DateTimeFormat(locale, {
            day: "2-digit",
            month: "short",
          }).format(date)}
        </p>
      </div>
    </div>
  );
}
