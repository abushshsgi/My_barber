import { useRouter } from "@tanstack/react-router";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchHairIngredientDetail, fetchHairScan, type HairIngredientDetail } from "@/lib/api/hair-advisor";

type Props = {
  scanId: string;
  inciEncoded: string;
  listPath: (scanId: string) => string;
};

export function HairAdvisor2IngredientDetailPage({ scanId, inciEncoded, listPath }: Props) {
  const router = useRouter();
  const inci = decodeURIComponent(inciEncoded);
  const [detail, setDetail] = useState<HairIngredientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const scan = await fetchHairScan(scanId);
        const productName = scan.care_product?.name ?? "";
        const data = await fetchHairIngredientDetail(inci, productName);
        if (active) setDetail(data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Yuklanmadi");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [inci, scanId]);

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-white">
        <Loader2 className="size-7 animate-spin text-[#111111]/40" />
      </div>
    );
  }

  if (!detail) {
    return <p className="p-8 text-center text-sm text-[#71717A]">Ma'lumot topilmadi</p>;
  }

  return (
    <div className="min-h-[100dvh] bg-white px-5 pb-16 text-[#111111]" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
      <button type="button" onClick={() => void router.navigate({ to: listPath(scanId) as never })}>
        <ChevronLeft className="size-6" />
      </button>
      <h1 className="mt-3 text-[26px] font-semibold tracking-tight">{detail.inci_name}</h1>
      {detail.aliases.length ? (
        <p className="mt-1 text-sm text-[#71717A]">{detail.aliases.join(", ")}</p>
      ) : null}
      <p className="mt-1 text-xs text-[#71717A]">{detail.category || detail.role_uz}</p>

      <Block title="Bu nima?">{detail.what_uz}</Block>
      <Block title="Foydalari">{detail.benefits_uz}</Block>
      {detail.cautions_uz.length ? (
        <Block title="Ehtimoliy nojo'ya ta'sirlari">{detail.cautions_uz.join(" ")}</Block>
      ) : null}
      <Block title="Qaysi sochlarga mos?">{detail.hair_uz}</Block>
      <Block title="Ushbu mahsulotdagi vazifasi">{detail.product_context_uz}</Block>
      <p className="mt-6 text-xs text-[#71717A]">
        Dalil holati: {detail.evidence_status}
        {detail.known_curated ? "" : " — cheklangan ma'lumot"}
      </p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: string }) {
  return (
    <section className="mt-6">
      <h2 className="text-[16px] font-semibold">{title}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-[#111111]/85">{children || "—"}</p>
    </section>
  );
}