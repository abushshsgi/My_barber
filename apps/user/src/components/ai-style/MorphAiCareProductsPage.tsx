import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCareProducts } from "@/hooks/use-care-products";
import type { CareProductCategory } from "@/lib/api/care-products";
import { navigateBack } from "@/lib/mobile-back";
import { cn } from "@/lib/utils";

const CATEGORIES: CareProductCategory[] = ["shampoo", "balsam", "mask", "oil", "spray", "other"];

export function MorphAiCareProductsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const list = useCareProducts({
    q: q.trim() || undefined,
    category: category === "all" ? undefined : category,
    recommended: true,
  });
  const rows = useMemo(() => list.data || [], [list.data]);

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] text-[#111111]">
      <div
        className="px-5 pb-10"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() => navigateBack(router, "/ai-style/care")}
          className="inline-flex size-11 items-center justify-center rounded-full bg-[#F0F0F0] cursor-pointer active:scale-95 transition-transform"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="size-5" strokeWidth={2.25} />
        </button>
        <p className="mt-6 text-[12px] font-medium tracking-wide text-[#111111]/35">
          {t("aiStylePage.care.catalog.badge", { defaultValue: "Tarkib" })}
        </p>
        <h1 className="mt-2 max-w-[18rem] text-[1.6rem] font-semibold leading-tight tracking-tight">
          {t("aiStylePage.care.catalog.title", { defaultValue: "Soch vositalari" })}
        </h1>
        <p className="mt-3 max-w-[22rem] text-[15px] leading-relaxed text-[#111111]/55">
          {t("aiStylePage.care.catalog.subtitle", {
            defaultValue: "Tarkib, qo‘llanish, kimlarga mos va yaxshi/yomon tomonlari.",
          })}
        </p>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#111111]/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("aiStylePage.care.catalog.search", { defaultValue: "Qidiruv" })}
            className="h-12 w-full rounded-full bg-[#F0F0F0] pl-10 pr-4 text-sm text-[#111111] outline-none ring-1 ring-black/10 placeholder:text-[#111111]/30"
          />
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <FilterChip
            active={category === "all"}
            onClick={() => setCategory("all")}
            label={t("aiStylePage.care.catalog.all", { defaultValue: "Hammasi" })}
          />
          {CATEGORIES.map((key) => (
            <FilterChip
              key={key}
              active={category === key}
              onClick={() => setCategory(key)}
              label={t(`aiStylePage.care.catalog.categories.${key}`, { defaultValue: key })}
            />
          ))}
        </div>

        {list.isLoading ? (
          <div className="grid min-h-[30vh] place-items-center">
            <Loader2 className="size-6 animate-spin text-[#111111]/40" />
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-16 text-center text-sm text-[#111111]/40">
            {t("aiStylePage.care.catalog.empty", { defaultValue: "Hozircha mahsulot yo‘q." })}
          </p>
        ) : (
          <div className="mt-6 space-y-2">
            {rows.map((row) => (
              <Link
                key={row.id}
                to="/ai-style/care/products/$productId"
                params={{ productId: String(row.id) }}
                className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-white/8"
              >
                {row.image_url ? (
                  <img src={row.image_url} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="size-16 shrink-0 rounded-xl bg-[#F0F0F0]" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{row.name}</p>
                  <p className="truncate text-[12px] text-[#111111]/40">
                    {row.brand || t(`aiStylePage.care.catalog.categories.${row.category}`, { defaultValue: row.category })}
                  </p>
                  {row.purpose_uz ? (
                    <p className="mt-1 line-clamp-2 text-[13px] text-[#111111]/55">{row.purpose_uz}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium",
        active ? "bg-white text-black" : "bg-[#F0F0F0] text-[#111111]/70",
      )}
    >
      {label}
    </button>
  );
}
