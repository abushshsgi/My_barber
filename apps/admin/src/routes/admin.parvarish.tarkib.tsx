import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, ImagePlus, Loader2, Pencil, Plus, Search, Sparkles, Trash2, WandSparkles, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/EmptyState";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  adminCareDemoAction,
  aiFillAdminCareProduct,
  deleteAdminCareProduct,
  fetchAdminCareProducts,
  downloadBazaExport,
  lookupAdminCareProduct,
  patchAdminCareProduct,
  upsertAdminProduct,
  type AdminCareProduct,
  type CareProductCategory,
} from "@/lib/admin-api";
import { detectCountryFromBarcode, normalizeBarcode } from "@/lib/detect-country-from-barcode";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/parvarish/tarkib")({
  component: ParvarishTarkibPage,
});

const CATEGORIES: { value: CareProductCategory; label: string }[] = [
  { value: "shampoo", label: "Shampun" },
  { value: "conditioner", label: "Konditsioner" },
  { value: "balsam", label: "Balzam" },
  { value: "mask", label: "Maska" },
  { value: "serum", label: "Sarum" },
  { value: "oil", label: "Yog'" },
  { value: "spray", label: "Sprey" },
  { value: "other", label: "Boshqa" },
];

const HAIR_TAGS: { value: string; label: string }[] = [
  { value: "oily", label: "Yog'li" },
  { value: "dry", label: "Quruq" },
  { value: "normal", label: "Normal" },
  { value: "damaged", label: "Shikastlangan" },
  { value: "fine", label: "Ingichka" },
  { value: "straight", label: "To'g'ri" },
  { value: "wavy", label: "To'lqinsimon" },
  { value: "curly", label: "Jingalak" },
  { value: "natural", label: "Tabiiy" },
  { value: "colored", label: "Bo'yalgan" },
  { value: "bleached", label: "Ochilgan" },
];

const SCALP_TAGS: { value: string; label: string }[] = [
  { value: "oily", label: "Yog'li teri" },
  { value: "dry", label: "Quruq teri" },
  { value: "normal", label: "Normal teri" },
  { value: "sensitive", label: "Sezgir teri" },
];

const CONCERN_TAGS: { value: string; label: string }[] = [
  { value: "dandruff", label: "Kepek" },
  { value: "hair_loss", label: "To'kilish" },
  { value: "frizz", label: "Shishish" },
  { value: "breakage", label: "Sinish" },
  { value: "color_fade", label: "Rang oqishi" },
  { value: "itch", label: "Qichishish" },
  { value: "split_ends", label: "Yorilgan uchlar" },
];

type FormState = {
  name: string;
  brand: string;
  category: CareProductCategory;
  barcode: string;
  country_of_origin: string;
  country_code_prefix: string;
  country_matched: boolean;
  image_url: string;
  ingredients_text: string;
  usage_uz: string;
  purpose_uz: string;
  suitable_for: string[];
  not_suitable_for: string[];
  scalp_types: string[];
  concerns: string[];
  pros_uz: string;
  cons_uz: string;
  warnings_uz: string;
  is_published: boolean;
  is_verified: boolean;
  sort_order: string;
  image: File | null;
  image_back: File | null;
  image_ingredients: File | null;
};

const emptyForm = (): FormState => ({
  name: "",
  brand: "",
  category: "shampoo",
  barcode: "",
  country_of_origin: "",
  country_code_prefix: "",
  country_matched: false,
  image_url: "",
  ingredients_text: "",
  usage_uz: "",
  purpose_uz: "",
  suitable_for: [],
  not_suitable_for: [],
  scalp_types: [],
  concerns: [],
  pros_uz: "",
  cons_uz: "",
  warnings_uz: "",
  is_published: true,
  is_verified: true,
  sort_order: "0",
  image: null,
  image_back: null,
  image_ingredients: null,
});

function applyBarcodeCountry(barcode: string): Pick<
  FormState,
  "barcode" | "country_of_origin" | "country_code_prefix" | "country_matched"
> {
  const digits = normalizeBarcode(barcode);
  const hit = detectCountryFromBarcode(digits);
  return {
    barcode: digits,
    country_of_origin: hit.isMatched ? hit.countryName : "",
    country_code_prefix: hit.prefix,
    country_matched: hit.isMatched,
  };
}

function toggleTag(list: string[], tag: string): string[] {
  return list.includes(tag) ? list.filter((x) => x !== tag) : [...list, tag];
}

function photoFingerprint(file: File | null): string {
  if (!file) return "";
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function takeImageFiles(list: FileList | File[] | null): File[] {
  if (!list) return [];
  return Array.from(list)
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, 3);
}

function slotsFromRoles(
  files: File[],
  roles: Array<"front" | "back" | "ingredients"> | undefined,
): Pick<FormState, "image" | "image_back" | "image_ingredients"> | null {
  if (!roles?.length || roles.length !== files.length) return null;
  const mapped = {
    image: null as File | null,
    image_back: null as File | null,
    image_ingredients: null as File | null,
  };
  files.forEach((file, index) => {
    const role = roles[index];
    if (role === "front") mapped.image = file;
    else if (role === "back") mapped.image_back = file;
    else mapped.image_ingredients = file;
  });
  return mapped;
}

function ParvarishTarkibPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [editing, setEditing] = useState<AdminCareProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const skipAutoFill = useRef(false);
  const editorOpen = creating || editing != null;

  const list = useQuery({
    queryKey: ["admin", "parvarish", "products", category, q],
    queryFn: () =>
      fetchAdminCareProducts({
        category: category === "all" ? "" : category,
        q: q.trim() || undefined,
      }),
  });

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category,
        barcode: form.barcode.trim(),
        country_of_origin: form.country_of_origin.trim(),
        country_code_prefix: form.country_code_prefix.trim(),
        is_verified: form.is_verified,
        image_url: form.image_url.trim(),
        ingredients_text: form.ingredients_text,
        usage_uz: form.usage_uz,
        purpose_uz: form.purpose_uz,
        suitable_for: form.suitable_for,
        not_suitable_for: form.not_suitable_for,
        scalp_types: form.scalp_types,
        concerns: form.concerns,
        pros_uz: form.pros_uz,
        cons_uz: form.cons_uz,
        warnings_uz: form.warnings_uz,
        is_published: form.is_published,
        sort_order: Number(form.sort_order) || 0,
        image: form.image,
      };
      if (!body.name) throw new Error("Mahsulot nomi kerak");
      if (editing) return patchAdminCareProduct(editing.id, body);
      return upsertAdminProduct(body);
    },
    onSuccess: () => {
      toast.success(editing ? "Saqlandi" : "Qo'shildi");
      closeEditor();
      void qc.invalidateQueries({ queryKey: ["admin", "parvarish"] });
    },
    onError: (e: Error) => toast.error(e.message || "Xato"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAdminCareProduct(id),
    onSuccess: () => {
      toast.success("O'chirildi");
      closeEditor();
      void qc.invalidateQueries({ queryKey: ["admin", "parvarish"] });
    },
    onError: (e: Error) => toast.error(e.message || "O'chirilmadi"),
  });

  const demoAction = useMutation({
    mutationFn: (action: "seed" | "purge") => adminCareDemoAction(action),
    onSuccess: (data) => {
      toast.success(data.message);
      void qc.invalidateQueries({ queryKey: ["admin", "parvarish"] });
    },
    onError: (e: Error) => toast.error(e.message || "Xato yuz berdi"),
  });

  const autoFill = useMutation({
    mutationFn: () => lookupAdminCareProduct(form.barcode.trim()),
    onSuccess: (data) => {
      const src = data.local || data.external;
      if (!src && !data.country?.is_matched) {
        toast.error("Tashqi manbalarda topilmadi");
        return;
      }
      const countryName = data.country?.country_name || data.country?.countryName || "";
      const prefix = data.country?.prefix || "";
      const matched = Boolean(data.country?.is_matched || data.country?.isMatched);
      setForm((p) => ({
        ...p,
        name: (data.local?.name || data.external?.name || data.external?.title || p.name).trim(),
        brand: (data.local?.brand || data.external?.brand || p.brand).trim(),
        category: ((data.local?.category || data.external?.category || p.category) as CareProductCategory),
        country_of_origin: countryName || data.external?.country_of_origin || p.country_of_origin,
        country_code_prefix: prefix || data.external?.country_code_prefix || p.country_code_prefix,
        country_matched: matched,
        image_url: data.local?.image_url || data.external?.image_url || p.image_url,
        ingredients_text:
          data.local?.ingredients_text
          || data.external?.ingredients_text
          || data.external?.ingredients_raw
          || p.ingredients_text,
        usage_uz: data.local?.usage_uz || p.usage_uz,
        suitable_for: data.local?.suitable_for || p.suitable_for,
        scalp_types: data.local?.scalp_types || p.scalp_types,
      }));
      toast.success(
        data.source === "db"
          ? "Mahsulot bazadan topildi"
          : data.source === "open_beauty_facts"
            ? "Open Beauty Facts'dan to'ldirildi"
            : data.source === "upcitemdb"
              ? "UPCitemdb'dan to'ldirildi"
              : "Davlat aniqlandi",
      );
    },
    onError: (e: Error) => toast.error(e.message || "Auto-fill ishlamadi"),
  });

  const applyAiFill = (data: Awaited<ReturnType<typeof aiFillAdminCareProduct>>, files: File[]) => {
    const detected = applyBarcodeCountry(data.barcode || form.barcode);
    const slots = slotsFromRoles(files, data.image_roles);
    skipAutoFill.current = true;
    setForm((p) => ({
      ...p,
      ...(slots || {}),
      name: data.name || p.name,
      brand: data.brand || p.brand,
      category: (CATEGORIES.some((c) => c.value === data.category)
        ? data.category
        : p.category) as CareProductCategory,
      barcode: detected.barcode || p.barcode,
      country_of_origin: detected.country_of_origin || data.country_of_origin || p.country_of_origin,
      country_code_prefix:
        detected.country_code_prefix || data.country_code_prefix || p.country_code_prefix,
      country_matched: detected.country_matched || data.country_matched,
      ingredients_text: data.ingredients_text || p.ingredients_text,
      usage_uz: data.usage_uz || p.usage_uz,
      purpose_uz: data.purpose_uz || p.purpose_uz,
      suitable_for: data.suitable_for?.length ? data.suitable_for : p.suitable_for,
      not_suitable_for: data.not_suitable_for?.length
        ? data.not_suitable_for
        : p.not_suitable_for,
      scalp_types: data.scalp_types?.length ? data.scalp_types : p.scalp_types,
      concerns: data.concerns?.length ? data.concerns : p.concerns,
      pros_uz: data.pros_uz || p.pros_uz,
      cons_uz: data.cons_uz || p.cons_uz,
      warnings_uz: data.warnings_uz || p.warnings_uz,
    }));
    setBatchFiles([]);
    toast.success("AI maydonlarni to‘ldirdi — tekshirib saqlang");
  };

  const aiFill = useMutation({
    mutationFn: (payload: { photos?: File[] }) =>
      aiFillAdminCareProduct(
        payload.photos?.length
          ? { photos: payload.photos }
          : {
              front: form.image,
              back: form.image_back,
              ingredients: form.image_ingredients,
            },
      ),
    onSuccess: (data, payload) => {
      const files =
        payload.photos?.length
          ? payload.photos
          : [form.image, form.image_back, form.image_ingredients].filter((x): x is File => !!x);
      applyAiFill(data, files);
    },
    onError: (e: Error) => toast.error(e.message || "AI to'ldirish ishlamadi"),
  });

  const hasAiPhotos = Boolean(form.image || form.image_back || form.image_ingredients);
  const photoKey = [
    photoFingerprint(form.image),
    photoFingerprint(form.image_back),
    photoFingerprint(form.image_ingredients),
  ].join("|");

  useEffect(() => {
    if (!editorOpen || !hasAiPhotos) return;
    if (skipAutoFill.current) {
      skipAutoFill.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      if (!aiFill.isPending) aiFill.mutate({});
    }, 700);
    return () => window.clearTimeout(timer);
    // photoKey — yangi rasm qo‘yilganda avtomatik AI
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey, editorOpen]);

  const acceptProductPhotos = (list: FileList | File[] | null) => {
    const files = takeImageFiles(list);
    if (!files.length) return;
    skipAutoFill.current = true;
    setBatchFiles(files);
    setForm((p) => ({
      ...p,
      image: files[0] || p.image,
      image_back: files[1] ?? null,
      image_ingredients: files[2] ?? null,
    }));
    window.setTimeout(() => aiFill.mutate({ photos: files }), 0);
  };

  const rows = useMemo(() => list.data || [], [list.data]);

  const closeEditor = () => {
    setCreating(false);
    setEditing(null);
    setBatchFiles([]);
    setForm(emptyForm());
  };

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setBatchFiles([]);
    skipAutoFill.current = true;
    setForm(emptyForm());
  };

  const openEdit = (row: AdminCareProduct) => {
    setCreating(false);
    setEditing(row);
    setBatchFiles([]);
    skipAutoFill.current = true;
    const detected = applyBarcodeCountry(row.barcode || "");
    setForm({
      name: row.name,
      brand: row.brand || "",
      category: (row.category as CareProductCategory) || "shampoo",
      barcode: detected.barcode || row.barcode || "",
      country_of_origin: row.country_of_origin || detected.country_of_origin,
      country_code_prefix: row.country_code_prefix || detected.country_code_prefix,
      country_matched: Boolean(row.country_of_origin) || detected.country_matched,
      image_url: row.external_image_url || "",
      ingredients_text: row.ingredients_text || "",
      usage_uz: row.usage_uz || "",
      purpose_uz: row.purpose_uz || "",
      suitable_for: row.suitable_for || [],
      not_suitable_for: row.not_suitable_for || [],
      scalp_types: row.scalp_types || [],
      concerns: row.concerns || [],
      pros_uz: row.pros_uz || "",
      cons_uz: row.cons_uz || "",
      warnings_uz: row.warnings_uz || "",
      is_published: row.is_published,
      is_verified: row.is_verified !== false,
      sort_order: String(row.sort_order ?? 0),
      image: null,
      image_back: null,
      image_ingredients: null,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Parvarish / Tarkib
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">
            Mahsulotlar
          </h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Katalog kartochkalari — tahrirlash o‘ng paneldan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => demoAction.mutate("seed")}
            disabled={demoAction.isPending}
            className="rounded-full border-primary/25 bg-primary/5 text-primary hover:bg-primary/10"
          >
            <Sparkles className="size-3.5" />
            20 ta Demo qo'shish
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => demoAction.mutate("purge")}
            disabled={demoAction.isPending}
            className="rounded-full border-destructive/25 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
            Demolarni tozalash
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              void downloadBazaExport({ kind: "products", format: "csv" })
                .then(() => toast.success("Yuklab olindi"))
                .catch((e: Error) => toast.error(e.message || "Yuklab bo'lmadi"));
            }}
          >
            <Download className="size-4" />
            Statistika
          </Button>
          <Button type="button" onClick={openCreate} className="rounded-full px-4">
            <Plus className="size-4" />
            Yangi
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="rounded-full pl-9"
            placeholder="Qidiruv..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterPill active={category === "all"} onClick={() => setCategory("all")} label="Hammasi" />
          {CATEGORIES.map((c) => (
            <FilterPill
              key={c.value}
              active={category === c.value}
              onClick={() => setCategory(c.value)}
              label={c.label}
            />
          ))}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-5",
          editorOpen ? "lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]" : "grid-cols-1",
        )}
      >
        <div>
          {list.isLoading ? (
            <CardSkeleton className="h-64" />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Katalog bo'sh"
              description="Yangi mahsulot qo'shing yoki filtrni o'zgartiring."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => {
                const active = editing?.id === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => openEdit(row)}
                    className={cn(
                      "group overflow-hidden rounded-2xl border text-left transition-colors",
                      active
                        ? "border-foreground bg-card shadow-sm"
                        : "border-border bg-card/60 hover:border-foreground/30",
                    )}
                  >
                    <div className="relative aspect-[5/3] bg-muted">
                      {row.image_url ? (
                        <img
                          src={row.image_url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-muted-foreground">
                          <ImagePlus className="size-6 opacity-40" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex gap-1">
                        <Badge variant="secondary" className="bg-background/90 backdrop-blur">
                          {CATEGORIES.find((c) => c.value === row.category)?.label || row.category}
                        </Badge>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge variant={row.is_published ? "default" : "outline"}>
                          {row.is_published ? "Nashr" : "Qoralama"}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.brand || "Brend yo‘q"}
                          </p>
                        </div>
                        <Pencil className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {row.purpose_uz || row.usage_uz || "Tavsif yo‘q"}
                      </p>
                      {row.barcode || row.country_of_origin ? (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {row.barcode ? `${row.barcode}` : ""}
                          {row.barcode && row.country_of_origin ? " · " : ""}
                          {row.country_of_origin || ""}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-muted-foreground">
                        Ko‘rdi: {row.viewers_count ?? 0} kishi / {row.views_count ?? 0}
                        {" · "}
                        Bosdi: {row.clickers_count ?? 0} kishi / {row.clicks_count ?? 0}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {editorOpen ? (
          <aside className="sticky top-20 h-fit rounded-2xl border border-border bg-card p-4 shadow-sm lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {editing ? "Tahrirlash" : "Yangi yozuv"}
                </p>
                <h2 className="font-heading text-lg font-semibold">
                  {editing ? editing.name : "Mahsulot"}
                </h2>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeEditor}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold">AI avtomatik to‘ldirish</p>
                    <p className="text-[11px] text-muted-foreground">
                      Tayyor mahsulotning old, orqa va tarkib rasmini tashlang. AI o‘zi ustunlarga qo‘yadi va formani yozadi.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0 rounded-full"
                    disabled={!hasAiPhotos || aiFill.isPending}
                    onClick={() =>
                      aiFill.mutate(
                        batchFiles.length ? { photos: batchFiles } : {},
                      )
                    }
                  >
                    {aiFill.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    {aiFill.isPending ? "O‘qilmoqda…" : "Qayta AI"}
                  </Button>
                </div>
                <label
                  className="mb-2 flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/30 bg-background/70 px-3 py-3 text-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    acceptProductPhotos(e.dataTransfer.files);
                  }}
                >
                  <Sparkles className="mb-1 size-4 text-primary" />
                  <span className="text-xs font-medium">1–3 ta rasmni birga tashlang</span>
                  <span className="text-[11px] text-muted-foreground">
                    Oldi · mahsulot orqasi · tarkib/INCI
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      acceptProductPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <PhotoSlot
                    label="Oldi"
                    file={form.image}
                    fallbackUrl={form.image_url}
                    onPick={(file) => setForm((p) => ({ ...p, image: file }))}
                  />
                  <PhotoSlot
                    label="Orqasi"
                    file={form.image_back}
                    onPick={(file) => setForm((p) => ({ ...p, image_back: file }))}
                  />
                  <PhotoSlot
                    label="Tarkib"
                    file={form.image_ingredients}
                    onPick={(file) => setForm((p) => ({ ...p, image_ingredients: file }))}
                  />
                </div>
                {aiFill.isPending ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    AI rasmni o‘qiyapti va maydonlarni to‘ldiryapti…
                  </p>
                ) : null}
              </div>

              <Field label="Barcode (EAN / UPC)">
                <Input
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="4781234567890"
                  value={form.barcode}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, ...applyBarcodeCountry(e.target.value) }))
                  }
                  onBlur={(e) =>
                    setForm((p) => ({ ...p, ...applyBarcodeCountry(e.target.value) }))
                  }
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ishlab chiqarilgan davlat">
                  <div className="relative">
                    <Input
                      value={form.country_of_origin}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          country_of_origin: e.target.value,
                          country_matched: false,
                        }))
                      }
                      placeholder="Avto-aniqlash"
                      className={cn(form.country_matched && "pr-9 border-emerald-500/50")}
                    />
                    {form.country_matched ? (
                      <Check
                        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-emerald-600"
                        aria-label="Davlat aniqlandi"
                      />
                    ) : null}
                  </div>
                  {form.country_code_prefix ? (
                    <p className="text-[11px] text-muted-foreground">
                      GS1 prefiks: {form.country_code_prefix}
                    </p>
                  ) : null}
                </Field>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-full"
                    disabled={form.barcode.replace(/\D/g, "").length < 8 || autoFill.isPending}
                    onClick={() => autoFill.mutate()}
                  >
                    {autoFill.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <WandSparkles className="size-4" />
                    )}
                    Auto-Fill Data
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nomi">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </Field>
                <Field label="Brend">
                  <Input
                    value={form.brand}
                    onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Kategoriya">
                  <Select
                    value={form.category}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, category: v as CareProductCategory }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Rasm URL (ixtiyoriy)">
                  <Input
                    value={form.image_url}
                    onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </Field>
              </div>

              <Field label="Tarkib (INCI)">
                <Textarea
                  rows={3}
                  value={form.ingredients_text}
                  onChange={(e) => setForm((p) => ({ ...p, ingredients_text: e.target.value }))}
                  placeholder="Aqua, Glycerin, ..."
                />
              </Field>

              <div className="grid gap-3">
                <Field label="Qo'llanish">
                  <Textarea
                    rows={2}
                    value={form.usage_uz}
                    onChange={(e) => setForm((p) => ({ ...p, usage_uz: e.target.value }))}
                  />
                </Field>
                <Field label="Nima uchun">
                  <Textarea
                    rows={2}
                    value={form.purpose_uz}
                    onChange={(e) => setForm((p) => ({ ...p, purpose_uz: e.target.value }))}
                  />
                </Field>
              </div>

              <TagGroup
                label="Kimlarga mos"
                tags={HAIR_TAGS}
                selected={form.suitable_for}
                onToggle={(tag) =>
                  setForm((p) => ({ ...p, suitable_for: toggleTag(p.suitable_for, tag) }))
                }
              />
              <TagGroup
                label="Kimlarga mos emas"
                tags={HAIR_TAGS}
                selected={form.not_suitable_for}
                onToggle={(tag) =>
                  setForm((p) => ({
                    ...p,
                    not_suitable_for: toggleTag(p.not_suitable_for, tag),
                  }))
                }
              />
              <TagGroup
                label="Bosh terisi"
                tags={SCALP_TAGS}
                selected={form.scalp_types}
                onToggle={(tag) =>
                  setForm((p) => ({ ...p, scalp_types: toggleTag(p.scalp_types, tag) }))
                }
              />
              <TagGroup
                label="Muammolar"
                tags={CONCERN_TAGS}
                selected={form.concerns}
                onToggle={(tag) =>
                  setForm((p) => ({ ...p, concerns: toggleTag(p.concerns, tag) }))
                }
              />

              <div className="grid gap-3">
                <Field label="Yaxshi tomonlari">
                  <Textarea
                    rows={2}
                    value={form.pros_uz}
                    onChange={(e) => setForm((p) => ({ ...p, pros_uz: e.target.value }))}
                  />
                </Field>
                <Field label="Yomon tomonlari">
                  <Textarea
                    rows={2}
                    value={form.cons_uz}
                    onChange={(e) => setForm((p) => ({ ...p, cons_uz: e.target.value }))}
                  />
                </Field>
                <Field label="Ogohlantirish">
                  <Textarea
                    rows={2}
                    value={form.warnings_uz}
                    onChange={(e) => setForm((p) => ({ ...p, warnings_uz: e.target.value }))}
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <Label>Nashr qilish</Label>
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, is_published: v }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <Label>Tasdiqlangan</Label>
                <Switch
                  checked={form.is_verified}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, is_verified: v }))}
                />
              </div>

              <Field label="Tartib">
                <Input
                  value={form.sort_order}
                  onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
                />
              </Field>

              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  className="flex-1 rounded-full"
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                >
                  Saqlash
                </Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={closeEditor}>
                  Bekor
                </Button>
                {editing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full text-destructive"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm("O'chirilsinmi?")) remove.mutate(editing.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function PhotoSlot({
  label,
  file,
  fallbackUrl,
  onPick,
}: {
  label: string;
  file: File | null;
  fallbackUrl?: string;
  onPick: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview(fallbackUrl || "");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, fallbackUrl]);

  return (
    <label className="relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-background text-center">
      {preview ? (
        <img src={preview} alt={label} className="absolute inset-0 size-full object-cover" />
      ) : (
        <ImagePlus className="size-5 text-muted-foreground" />
      )}
      <span className="relative z-10 mt-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
        {label}
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-full px-3.5 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function TagGroup({
  label,
  tags,
  selected,
  onToggle,
}: {
  label: string;
  tags: { value: string; label: string }[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const on = selected.includes(tag.value);
          return (
            <label
              key={`${label}-${tag.value}`}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                on ? "border-foreground bg-foreground/5" : "border-border text-muted-foreground",
              )}
            >
              <Checkbox
                checked={on}
                onCheckedChange={() => onToggle(tag.value)}
                className="size-3.5"
              />
              {tag.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
