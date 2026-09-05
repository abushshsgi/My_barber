import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  createCareShelfItem,
  deleteCareShelfItem,
  estimateCareShelf,
  fetchCareShelf,
  updateCareShelfItem,
  type CareShelfCategory,
  type CareShelfEstimate,
  type CareShelfItem,
} from "@/lib/api/care-products";
import { cn } from "@/lib/utils";

const CACHE_KEY = "morph-care-shelf-cache-v1";
const ALERT_KEY = "morph-care-shelf-alerts-v1";
const QUERY_KEY = ["ai", "care", "shelf"] as const;

type EditorMode = "manual" | "ai";

type FormState = {
  name: string;
  brand: string;
  category: CareShelfCategory;
  volume_ml: string;
  usage_frequency: string;
  opened_at: string;
  pao_months: "3" | "6" | "12" | "24";
};

const CATEGORIES: { value: CareShelfCategory; label: string }[] = [
  { value: "hair", label: "Soch" },
  { value: "face", label: "Yuz" },
  { value: "scalp", label: "Bosh terisi" },
  { value: "beard", label: "Soqol" },
];

const FREQUENCIES = [
  "Kuniga 1 mahal",
  "Kuniga 2 mahal",
  "Haftada 2-3 marta",
  "Haftada 1 marta",
  "Oyiga 10 marta",
] as const;

const ease = [0.22, 1, 0.36, 1] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultForm(): FormState {
  return {
    name: "",
    brand: "",
    category: "hair",
    volume_ml: "250",
    usage_frequency: FREQUENCIES[0],
    opened_at: todayIso(),
    pao_months: "12",
  };
}

function readCachedShelf():
  | {
      items: CareShelfItem[];
      summary: { active: number; refill_soon: number; expired: number };
    }
  | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.items)) return undefined;
    return data;
  } catch {
    return undefined;
  }
}

function fmtDate(iso?: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function statusStyle(status: string): { badge: string; bar: string } {
  if (status === "EXPIRED") {
    return {
      badge: "bg-red-50 text-red-700 ring-red-100",
      bar: "from-red-500 to-rose-500",
    };
  }
  if (status === "REFILL_SOON") {
    return {
      badge: "bg-amber-50 text-amber-700 ring-amber-100",
      bar: "from-amber-500 to-orange-400",
    };
  }
  return {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    bar: "from-emerald-500 to-teal-500",
  };
}

function maybeNotifyBrowser(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission === "granted") {
    void new window.Notification(title, { body });
    return;
  }
  if (window.Notification.permission === "default") {
    void window.Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        void new window.Notification(title, { body });
      }
    });
  }
}

export function CareShelfTracker() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<EditorMode>("manual");
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const [editing, setEditing] = useState<CareShelfItem | null>(null);
  const [estimate, setEstimate] = useState<CareShelfEstimate | null>(null);

  const shelfQ = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchCareShelf,
    initialData: readCachedShelf,
    staleTime: 20_000,
  });

  useEffect(() => {
    if (!shelfQ.data || typeof window === "undefined") return;
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(shelfQ.data));
  }, [shelfQ.data]);

  useEffect(() => {
    if (!shelfQ.data?.items?.length || typeof window === "undefined") return;
    const seenRaw = window.localStorage.getItem(ALERT_KEY);
    const seen = seenRaw ? (JSON.parse(seenRaw) as Record<string, true>) : {};
    let changed = false;

    for (const item of shelfQ.data.items) {
      if (item.status_flag === "EXPIRED") {
        const key = `expired:${item.id}:${item.expiration_date}`;
        if (!seen[key]) {
          seen[key] = true;
          changed = true;
          toast.warning(`${item.name}: Muddati o'tgan (PAO).`);
          maybeNotifyBrowser("Mahsulot muddati o'tgan", `${item.name} ni yangilang.`);
        }
        continue;
      }
      if (item.remaining_percent <= 10 || item.estimated_days_left <= 7) {
        const key = `refill:${item.id}:${item.refill_date}`;
        if (!seen[key]) {
          seen[key] = true;
          changed = true;
          toast.message(`${item.name}: tez orada tugaydi, qayta sotib olishni unutmang.`);
          maybeNotifyBrowser("Mahsulot tugamoqda", `${item.name} taxminan 1 haftada tugaydi.`);
        }
      }
      if (item.days_to_pao <= 7 && item.days_to_pao >= 0) {
        const key = `pao:${item.id}:${item.expiration_date}`;
        if (!seen[key]) {
          seen[key] = true;
          changed = true;
          toast.message(`${item.name}: PAO muddati tugashiga ${item.days_to_pao} kun qoldi.`);
          maybeNotifyBrowser("PAO ogohlantirish", `${item.name} uchun PAO muddati tugamoqda.`);
        }
      }
    }
    if (changed) window.localStorage.setItem(ALERT_KEY, JSON.stringify(seen));
  }, [shelfQ.data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category,
        volume_ml: Number(form.volume_ml || 0),
        usage_frequency: form.usage_frequency,
        opened_at: form.opened_at,
        pao_months: Number(form.pao_months) as 3 | 6 | 12 | 24,
        with_ai: mode === "ai",
      };
      if (editing) {
        return updateCareShelfItem(editing.id, payload);
      }
      return createCareShelfItem(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setOpen(false);
      setEditing(null);
      setEstimate(null);
      setForm(defaultForm());
      toast.success(t("common.saved", { defaultValue: "Saqlandi" }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCareShelfItem(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (e: Error) => toast.error(e.message),
  });

  const estimateMut = useMutation({
    mutationFn: async () =>
      estimateCareShelf({
        product_name: form.name.trim(),
        category: form.category,
        volume_ml: Number(form.volume_ml || 0),
        usage_frequency: form.usage_frequency,
        opened_at: form.opened_at,
        pao_months: Number(form.pao_months) as 3 | 6 | 12 | 24,
      }),
    onSuccess: (res) => setEstimate(res.estimate),
    onError: (e: Error) => toast.error(e.message),
  });

  const summary = shelfQ.data?.summary || { active: 0, refill_soon: 0, expired: 0 };
  const items = shelfQ.data?.items || [];
  const saving = saveMut.isPending || estimateMut.isPending;

  const canSubmit = useMemo(
    () => form.name.trim().length >= 2 && Number(form.volume_ml) >= 10 && !!form.opened_at,
    [form],
  );

  const openAdd = () => {
    setEditing(null);
    setMode("manual");
    setEstimate(null);
    setForm(defaultForm());
    setOpen(true);
  };

  const openEdit = (item: CareShelfItem) => {
    setEditing(item);
    setMode("manual");
    setEstimate(null);
    setForm({
      name: item.name,
      brand: item.brand || "",
      category: (item.category as CareShelfCategory) || "hair",
      volume_ml: String(item.volume_ml || 100),
      usage_frequency: item.usage_frequency || FREQUENCIES[0],
      opened_at: item.opened_at || todayIso(),
      pao_months: String(item.pao_months || 12) as FormState["pao_months"],
    });
    setOpen(true);
  };

  return (
    <section className="mt-9">
      <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-[#111111]/35">
              {t("aiStylePage.care.badge", { defaultValue: "Parvarish" })}
            </p>
            <h2 className="mt-1 text-[1.05rem] font-semibold tracking-tight text-[#111111]">
              {t("aiStylePage.care.shelf.title", { defaultValue: "Mening parvarish vositalarim" })}
            </h2>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#111111] px-3.5 text-[12px] font-semibold text-white"
          >
            <Plus className="size-3.5" />
            {t("aiStylePage.care.shelf.add", { defaultValue: "Mahsulot qo'shish" })}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <SummaryChip
            iconClass="bg-emerald-500"
            label={t("aiStylePage.care.shelf.active", { defaultValue: "Faol" })}
            count={summary.active}
          />
          <SummaryChip
            iconClass="bg-amber-500"
            label={t("aiStylePage.care.shelf.refillSoon", { defaultValue: "Tugamoqda" })}
            count={summary.refill_soon}
          />
          <SummaryChip
            iconClass="bg-red-500"
            label={t("aiStylePage.care.shelf.expired", { defaultValue: "Muddati o'tdi" })}
            count={summary.expired}
          />
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        {shelfQ.isLoading && items.length === 0 ? (
          <div className="space-y-2.5">
            {[0, 1].map((k) => (
              <div key={k} className="h-[126px] animate-pulse rounded-2xl bg-white/70" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-6 text-center text-[13px] text-[#111111]/55">
            {t("aiStylePage.care.shelf.empty", {
              defaultValue: "Hali mahsulot qo'shilmagan. Birinchisini qo'shing va tugash muddatini kuzating.",
            })}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item, i) => {
              const sx = statusStyle(item.status_flag);
              return (
                <motion.article
                  key={item.id}
                  layout
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.28, delay: i * 0.02, ease }}
                  className="overflow-hidden rounded-2xl border border-black/5 bg-white p-3.5 shadow-[0_8px_20px_-18px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex gap-3">
                    <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#F5F5F5]">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="size-4.5 text-[#111111]/45" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold">{item.name}</p>
                          <p className="truncate text-[12px] text-[#111111]/45">
                            {item.brand || "Morf Care"} · {item.category}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ring-1",
                            sx.badge,
                          )}
                        >
                          {item.status_label}
                        </span>
                      </div>

                      <div className="mt-2.5">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-[#111111]/45">
                          <span>{item.remaining_percent}%</span>
                          <span>{item.estimated_days_left} kun</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#F2F2F2]">
                          <motion.div
                            initial={false}
                            animate={{ width: `${Math.max(4, item.remaining_percent)}%` }}
                            transition={{ duration: reduce ? 0 : 0.45, ease }}
                            className={cn("h-full rounded-full bg-gradient-to-r", sx.bar)}
                          />
                        </div>
                      </div>

                      <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px] text-[#111111]/50">
                        <div className="inline-flex items-center gap-1.5">
                          <Calendar className="size-3" />
                          {t("aiStylePage.care.shelf.opened", { defaultValue: "Ochilgan" })}: {fmtDate(item.opened_at)}
                        </div>
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <AlertTriangle className="size-3" />
                          PAO: {item.pao_code}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-2.5 rounded-xl bg-[#FAFAFA] px-2.5 py-2 text-[12px] text-[#111111]/65">
                    {item.ai_advice}
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        toast.success(t("aiStylePage.care.shelf.refillSaved", { defaultValue: "Refill eslatmasi qo'shildi" }));
                        maybeNotifyBrowser("Refill eslatmasi", `${item.name} uchun qayta sotib olish eslatmasi saqlandi.`);
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-[#111111] px-3 py-1.5 text-[11px] font-medium text-white"
                    >
                      <RefreshCw className="size-3" />
                      {t("aiStylePage.care.shelf.refill", { defaultValue: "Qayta sotib olish" })}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="inline-flex items-center gap-1 rounded-full bg-[#F2F2F2] px-3 py-1.5 text-[11px] font-medium text-[#111111]"
                    >
                      <Pencil className="size-3" />
                      {t("common.edit", { defaultValue: "Tahrirlash" })}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm("Mahsulotni o'chiraymi?")) return;
                        deleteMut.mutate(item.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-700"
                    >
                      <Trash2 className="size-3" />
                      {t("common.delete", { defaultValue: "O'chirish" })}
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} aria-label="Close" />
            <motion.div
              initial={reduce ? false : { y: "100%" }}
              animate={{ y: 0 }}
              exit={reduce ? undefined : { y: "100%" }}
              transition={{ duration: 0.28, ease }}
              className="relative z-[1] w-full max-w-md rounded-t-[26px] bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_40px_rgba(0,0,0,0.2)] sm:rounded-[26px]"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-semibold tracking-tight">
                  {editing
                    ? t("aiStylePage.care.shelf.editTitle", { defaultValue: "Mahsulotni tahrirlash" })
                    : t("aiStylePage.care.shelf.addTitle", { defaultValue: "Mahsulot qo'shish" })}
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid size-8 place-items-center rounded-full bg-[#F4F4F4]"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-full bg-[#F4F4F4] p-1">
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className={cn(
                    "h-9 rounded-full text-[12px] font-medium",
                    mode === "manual" ? "bg-white text-[#111111] shadow-sm" : "text-[#111111]/55",
                  )}
                >
                  Manual
                </button>
                <button
                  type="button"
                  onClick={() => setMode("ai")}
                  className={cn(
                    "inline-flex h-9 items-center justify-center gap-1 rounded-full text-[12px] font-medium",
                    mode === "ai" ? "bg-white text-[#111111] shadow-sm" : "text-[#111111]/55",
                  )}
                >
                  <Sparkles className="size-3" />
                  AI Quick
                </button>
              </div>

              <div className="mt-3 space-y-2.5">
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t("aiStylePage.care.shelf.name", { defaultValue: "Mahsulot nomi" })}
                  className="h-11 w-full rounded-xl border border-black/10 px-3 text-[13px] outline-none focus:border-black/25"
                />
                <input
                  value={form.brand}
                  onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                  placeholder={t("aiStylePage.care.shelf.brand", { defaultValue: "Brend (ixtiyoriy)" })}
                  className="h-11 w-full rounded-xl border border-black/10 px-3 text-[13px] outline-none focus:border-black/25"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, category: e.target.value as CareShelfCategory }))
                    }
                    className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-[13px] outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={10}
                    max={3000}
                    value={form.volume_ml}
                    onChange={(e) => setForm((p) => ({ ...p, volume_ml: e.target.value }))}
                    placeholder="250 ml"
                    className="h-11 w-full rounded-xl border border-black/10 px-3 text-[13px] outline-none focus:border-black/25"
                  />
                </div>
                <select
                  value={form.usage_frequency}
                  onChange={(e) => setForm((p) => ({ ...p, usage_frequency: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-[13px] outline-none"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={form.opened_at}
                    onChange={(e) => setForm((p) => ({ ...p, opened_at: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-black/10 px-3 text-[13px] outline-none"
                  />
                  <select
                    value={form.pao_months}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, pao_months: e.target.value as FormState["pao_months"] }))
                    }
                    className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-[13px] outline-none"
                  >
                    {["3", "6", "12", "24"].map((m) => (
                      <option key={m} value={m}>
                        {m}M
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {mode === "ai" ? (
                <div className="mt-3 rounded-2xl border border-[#E8E8E8] bg-[#FAFAFA] p-3">
                  <button
                    type="button"
                    disabled={!canSubmit || estimateMut.isPending}
                    onClick={() => estimateMut.mutate()}
                    className="inline-flex h-9 items-center gap-1 rounded-full bg-[#111111] px-3 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:bg-[#111111]/20"
                  >
                    {estimateMut.isPending ? (
                      <span className="size-3 animate-spin rounded-full border border-white/30 border-t-white" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    AI hisoblash
                  </button>
                  {estimate ? (
                    <div className="mt-2.5 space-y-1 text-[12px] text-[#111111]/70">
                      <p>
                        <strong>{estimate.estimated_days_left}</strong> kun qoldi · refill:{" "}
                        <strong>{fmtDate(estimate.refill_date)}</strong>
                      </p>
                      <p>Holat: {estimate.status_flag}</p>
                      <p className="text-[#111111]/60">{estimate.ai_advice}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-11 flex-1 rounded-full border border-black/10 text-[13px] font-semibold"
                >
                  {t("common.cancel", { defaultValue: "Bekor qilish" })}
                </button>
                <button
                  type="button"
                  disabled={!canSubmit || saving}
                  onClick={() => saveMut.mutate()}
                  className="h-11 flex-[1.7] rounded-full bg-[#111111] text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#111111]/20"
                >
                  {saving ? t("common.loading", { defaultValue: "Yuklanmoqda..." }) : t("common.save", { defaultValue: "Saqlash" })}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function SummaryChip({
  iconClass,
  label,
  count,
}: {
  iconClass: string;
  label: string;
  count: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F5] px-3 py-1.5 text-[12px] font-medium text-[#111111]/75">
      <span className={cn("size-2 rounded-full", iconClass)} />
      {label}
      <span className="font-semibold text-[#111111]">{count}</span>
    </span>
  );
}
