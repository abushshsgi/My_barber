import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCareProduct } from "@/hooks/use-care-products";
import { navigateBack } from "@/lib/mobile-back";

type Props = {
  productId: string;
};

export function MorphAiCareProductDetailPage({ productId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const id = Number(productId);
  const q = useCareProduct(id);

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] text-[#111111]">
      <div
        className="px-5 pb-12"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() => navigateBack(router, "/ai-style/care/products")}
          className="inline-flex size-11 items-center justify-center rounded-full bg-[#F0F0F0] cursor-pointer active:scale-95 transition-transform"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="size-5" strokeWidth={2.25} />
        </button>

        {q.isLoading ? (
          <div className="grid min-h-[40vh] place-items-center">
            <Loader2 className="size-6 animate-spin text-[#111111]/40" />
          </div>
        ) : !q.data ? (
          <p className="mt-16 text-center text-sm text-[#111111]/40">
            {t("aiStylePage.care.catalog.notFound", { defaultValue: "Mahsulot topilmadi." })}
          </p>
        ) : (
          <article className="mt-6">
            {q.data.image_url ? (
              <img
                src={q.data.image_url}
                alt=""
                className="aspect-[4/3] w-full rounded-3xl object-cover"
              />
            ) : null}
            <p className="mt-5 text-[12px] font-medium tracking-wide text-[#111111]/35">
              {t(`aiStylePage.care.catalog.categories.${q.data.category}`, {
                defaultValue: q.data.category,
              })}
            </p>
            <h1 className="mt-2 text-[1.7rem] font-semibold leading-tight tracking-tight">
              {q.data.name}
            </h1>
            {q.data.brand ? <p className="mt-1 text-sm text-[#111111]/45">{q.data.brand}</p> : null}

            <Block title={t("aiStylePage.care.catalog.purpose", { defaultValue: "Nima uchun" })}>
              {q.data.purpose_uz || "—"}
            </Block>
            <Block title={t("aiStylePage.care.catalog.usage", { defaultValue: "Qo‘llanish" })}>
              {q.data.usage_uz || "—"}
            </Block>
            <Block title={t("aiStylePage.care.catalog.who", { defaultValue: "Kimlarga" })}>
              {(q.data.suitable_for || []).length
                ? q.data.suitable_for
                    .map((tag) =>
                      t(`aiStylePage.care.catalog.tags.${tag}`, { defaultValue: tag }),
                    )
                    .join(", ")
                : "—"}
            </Block>
            {q.data.not_suitable_for?.length ? (
              <Block title={t("aiStylePage.care.catalog.whoNot", { defaultValue: "Mos emas" })}>
                {q.data.not_suitable_for
                  .map((tag) => t(`aiStylePage.care.catalog.tags.${tag}`, { defaultValue: tag }))
                  .join(", ")}
              </Block>
            ) : null}
            <Block title={t("aiStylePage.care.catalog.pros", { defaultValue: "Yaxshi tomonlari" })}>
              {q.data.pros_uz || "—"}
            </Block>
            <Block title={t("aiStylePage.care.catalog.cons", { defaultValue: "Yomon tomonlari" })}>
              {q.data.cons_uz || "—"}
            </Block>
            {q.data.warnings_uz ? (
              <Block title={t("aiStylePage.care.catalog.warnings", { defaultValue: "Ogohlantirish" })}>
                {q.data.warnings_uz}
              </Block>
            ) : null}
            <Block title={t("aiStylePage.care.catalog.ingredients", { defaultValue: "Tarkib" })}>
              {q.data.ingredients_text ||
                (q.data.ingredients || []).join(", ") ||
                "—"}
            </Block>
          </article>
        )}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: string }) {
  return (
    <section className="mt-8">
      <h2 className="text-[12px] font-medium tracking-wide text-[#111111]/35">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-[#111111]/75">{children}</p>
    </section>
  );
}
