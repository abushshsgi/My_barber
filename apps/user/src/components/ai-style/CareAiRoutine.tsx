import { useQuery } from "@tanstack/react-query";
import { Check, Leaf, Loader2, RefreshCw, ScanLine } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchSavedCarePlan,
  generateCarePlan,
  type AiCarePlanTask,
  type CareProduct,
  type MyCareProduct,
} from "@/lib/api/care-products";
import { resolveMediaUrl } from "@/lib/media-url";
import type { CareQuizAnswers } from "@/lib/morf-ai-care";
import { cn } from "@/lib/utils";

type DayMode = "today" | "morning" | "evening" | "weekly";

const MODES: { id: DayMode; label: string }[] = [
  { id: "today", label: "Bugun" },
  { id: "morning", label: "Ertalab" },
  { id: "evening", label: "Kech" },
  { id: "weekly", label: "Hafta" },
];

const PREVIEW = 4;

function doneStorageKey(date: string) {
  return `morph-care-done:${date}`;
}

function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function loadDone(date: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(doneStorageKey(date));
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function imageFor(
  productId: number | null | undefined,
  mine: MyCareProduct[],
  catalog: CareProduct[],
) {
  if (!productId) return null;
  const row = mine.find((p) => p.id === productId) || catalog.find((p) => p.id === productId);
  return resolveMediaUrl(row?.image_url) || row?.image_url || null;
}

export function CareAiRoutine({
  quiz,
  myProducts,
  catalog,
  loadingProducts,
  onOpenCatalog,
  onOpenScan,
  onOpenProduct,
}: {
  quiz: CareQuizAnswers;
  myProducts: MyCareProduct[];
  catalog: CareProduct[];
  loadingProducts: boolean;
  onOpenCatalog: () => void;
  onOpenScan: () => void;
  onOpenProduct: (id: number) => void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<DayMode>("today");
  const [open, setOpen] = useState(false);
  const [force, setForce] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>(() => loadDone(todayIso()));
  const ids = useMemo(
    () => [...myProducts.map((p) => p.id)].sort((a, b) => a - b),
    [myProducts],
  );
  const profileKey = `${quiz.condition}|${quiz.texture}|${quiz.colorStatus}`;
  const planQ = useQuery({
    queryKey: ["ai", "care", "plan", profileKey, ids.join(","), force],
    enabled: ids.length > 0 && Boolean(quiz.condition && quiz.texture && quiz.colorStatus),
    staleTime: 5 * 60_000,
    retry: 0,
    queryFn: async () => {
      if (force === 0) {
        const saved = await fetchSavedCarePlan({ productIds: ids, profileKey });
        if (saved?.plan && saved.stale === false) return saved.plan;
      }
      return generateCarePlan({
        condition: quiz.condition || "normal",
        texture: quiz.texture || "straight",
        color_status: quiz.colorStatus || "natural",
        products: myProducts.map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
        })),
        mode: "full",
        morning_time: "07:30",
        evening_time: "21:00",
      });
    },
  });

  const tasks = useMemo(() => {
    const plan = planQ.data;
    if (!plan) return [] as AiCarePlanTask[];
    if (mode === "morning") return plan.morning || [];
    if (mode === "evening") return plan.evening || [];
    if (mode === "weekly") {
      if (plan.weekly?.length) return plan.weekly;
      return (plan.weekly_schedule || []).map((row, i) => ({
        id: `week-${i}`,
        title: row.task,
        subtitle: row.day,
        time: row.time,
        icon: "leaf",
        product_id: row.product_id,
        product_name: row.product_name,
      }));
    }
    return [...(plan.morning || []), ...(plan.evening || [])];
  }, [mode, planQ.data]);

  const doneCount = tasks.filter((task) => done[task.id]).length;
  const progress = tasks.length ? doneCount / tasks.length : 0;
  const visible = open ? tasks : tasks.slice(0, PREVIEW);
  const empty = !loadingProducts && myProducts.length === 0;

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(doneStorageKey(todayIso()), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (empty) {
    return (
      <div className="mt-10 flex flex-col items-center px-2 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-white ring-1 ring-black/5">
          <Leaf className="size-7" />
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#111]/45">
          {t("aiStylePage.care.badge", { defaultValue: "Parvarish" })}
        </p>
        <h2 className="mt-2 text-xl font-extrabold tracking-tight">
          {t("aiStylePage.care.myProducts.emptyTitle", { defaultValue: "Hali mahsulot yo‘q" })}
        </h2>
        <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-[#111]/55">
          Reja sizning mahsulotlaringiz bilan tuziladi — avval qo‘shing
        </p>
        <button
          type="button"
          onClick={onOpenCatalog}
          className="mt-6 flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[#111] text-sm font-semibold text-white"
        >
          Tavsiya etilgan mahsulotlar
        </button>
        <button
          type="button"
          onClick={onOpenScan}
          className="mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold ring-1 ring-black/10"
        >
          <ScanLine className="size-4" />
          Skaner
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[17px] font-extrabold tracking-tight">
          {t("aiStylePage.care.routine.planTitle", { defaultValue: "Morf AI Parvarish Rejasi" })}
        </p>
        {myProducts.length > 0 ? (
          <button
            type="button"
            onClick={() => setForce((n) => n + 1)}
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-white ring-1 ring-black/10"
            aria-label="Yangilash"
          >
            <RefreshCw className={cn("size-4", planQ.isFetching && "animate-spin")} />
          </button>
        ) : null}
      </div>
      {planQ.data && tasks.length > 0 ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E7E7E8]">
            <div
              className="h-full rounded-full bg-[#111]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <span className="text-[12px] font-semibold tabular-nums text-[#111]/55">
            {doneCount}/{tasks.length}
          </span>
        </div>
      ) : null}

      {planQ.isLoading || (planQ.isFetching && !planQ.data) ? (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-6 animate-spin text-[#111]/40" />
          <p className="text-sm text-[#111]/55">Shaxsiy parvarish rejasi tuzilmoqda.</p>
        </div>
      ) : null}

      {planQ.isError && !planQ.data ? (
        <button
          type="button"
          onClick={() => setForce((n) => n + 1)}
          className="mt-6 w-full cursor-pointer rounded-2xl bg-white px-4 py-4 text-left ring-1 ring-black/5"
        >
          <p className="text-sm font-semibold">
            {planQ.error instanceof Error ? planQ.error.message : "Reja yaratilmadi."}
          </p>
          <p className="mt-1 text-xs text-[#111]/45">Qayta urinish</p>
        </button>
      ) : null}

      {planQ.data ? (
        <>
          <div className="mt-4 flex rounded-xl bg-[#EFEFF1] p-0.5">
            {MODES.map((item) => {
              const on = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMode(item.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "h-8 flex-1 cursor-pointer rounded-[9px] text-[12px] font-semibold text-[#111]/45",
                    on && "bg-white font-bold text-[#111] shadow-sm",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 space-y-1.5">
            {visible.map((task) => {
              const isDone = Boolean(done[task.id]);
              const img = imageFor(task.product_id, myProducts, catalog);
              const name =
                task.product_name && task.product_name !== "null" ? task.product_name : "";
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    if (task.product_id) onOpenProduct(task.product_id);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-2xl bg-white py-2 pl-2 pr-2.5 text-left ring-1 ring-black/5",
                    isDone && "opacity-55",
                  )}
                >
                  {img ? (
                    <img src={img} alt="" className="size-9 rounded-[10px] object-cover" />
                  ) : (
                    <span className="grid size-9 place-items-center rounded-[10px] bg-[#EFEFF1] text-[10px] font-bold">
                      AI
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-[13px] font-bold",
                        isDone && "text-[#111]/45 line-through",
                      )}
                    >
                      {task.title}
                    </span>
                    {name ? (
                      <span className="mt-0.5 block truncate text-[11px] text-[#111]/50">{name}</span>
                    ) : task.subtitle ? (
                      <span className="mt-0.5 block truncate text-[11px] text-[#111]/50">
                        {task.subtitle}
                      </span>
                    ) : null}
                  </span>
                  {task.time ? (
                    <span className="rounded-full bg-[#F3F3F4] px-2 py-1 text-[11px] font-semibold tabular-nums">
                      {task.time}
                    </span>
                  ) : null}
                  <span
                    role="checkbox"
                    aria-checked={isDone}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(task.id);
                    }}
                    className={cn(
                      "grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] border-black/20",
                      isDone && "border-[#16A34A] bg-[#16A34A] text-white",
                    )}
                  >
                    {isDone ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          {tasks.length > PREVIEW ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-2 w-full cursor-pointer py-2 text-center text-[13px] font-semibold text-[#111]/55"
            >
              {open ? "Yig‘ish" : `Yana ${tasks.length - PREVIEW} ta`}
            </button>
          ) : null}
        </>
      ) : null}

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold">Mening mahsulotlarim</h2>
          <button
            type="button"
            onClick={onOpenScan}
            className="inline-flex cursor-pointer items-center gap-1 text-[13px] font-semibold"
          >
            <ScanLine className="size-4" />
            Skaner
          </button>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {myProducts.map((p) => {
            const img = resolveMediaUrl(p.image_url) || p.image_url;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenProduct(p.id)}
                className="w-24 shrink-0 cursor-pointer text-left"
              >
                {img ? (
                  <img src={img} alt="" className="h-24 w-24 rounded-2xl object-cover" />
                ) : (
                  <span className="grid h-24 w-24 place-items-center rounded-2xl bg-white text-[11px] font-bold ring-1 ring-black/5">
                    {p.brand?.slice(0, 2) || "MS"}
                  </span>
                )}
                <span className="mt-1 block truncate text-[11px] font-semibold">{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
