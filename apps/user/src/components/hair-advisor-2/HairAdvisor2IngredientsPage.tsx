import { useRouter } from "@tanstack/react-router";
import { ChevronLeft, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { fetchHairScan, type HairScanDetail } from "@/lib/api/hair-advisor";
import { navigateBack } from "@/lib/mobile-back";
import { cn } from "@/lib/utils";

type Props = {
  scanId: string;
  resultPath: (scanId: string) => string;
  detailPath: (scanId: string, inci: string) => string;
};

export function HairAdvisor2IngredientsPage({ scanId, resultPath, detailPath }: Props) {
  const router = useRouter();
  const [payload, setPayload] = useState<HairScanDetail | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    void fetchHairScan(scanId)
      .then(setPayload)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Xatolik"));
  }, [scanId]);

  const list = useMemo(() => {
    const raw =
      payload?.analysis?.result?.ingredients ??
      payload?.ingredients_confirmed ??
      payload?.ingredients_draft ??
      payload?.care_product?.ingredients ??
      [];
    const needle = q.trim().toLowerCase();
    if (!needle) return raw;
    return raw.filter((i) => i.toLowerCase().includes(needle));
  }, [payload, q]);

  const roles = payload?.analysis?.result?.key_ingredients as Array<Record<string, unknown>> | undefined;

  return (
    <div className="min-h-[100dvh] bg-white text-[#111111]">
      <header className="px-5 pt-4" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <button type="button" onClick={() => void router.navigate({ to: resultPath(scanId) as never })} className="mb-3">
          <ChevronLeft className="size-6" />
        </button>
        <h1 className="text-[26px] font-semibold tracking-tight">Mahsulot tarkibi</h1>
        <p className="mt-1 text-[15px] text-[#71717A]">Barcha ingredientlar va ularning vazifalari</p>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71717A]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ingredient qidirish"
            className="h-11 w-full rounded-2xl bg-[#F7F7F8] pl-10 pr-3 text-sm ring-1 ring-[#E8E8EB]"
          />
        </div>
      </header>

      <ul className="mx-auto mt-4 max-w-lg space-y-0 px-5 pb-16">
        {list.length === 0 ? (
          <li className="py-8 text-center text-sm text-[#71717A]">
            Mahsulotning to'liq tarkibi hali tasdiqlanmagan.
          </li>
        ) : (
          list.map((inci, idx) => {
            const roleRow = roles?.find((r) => String(r.inci ?? "").toLowerCase() === inci.toLowerCase());
            const role = String(roleRow?.note ?? roleRow?.role_uz ?? "—");
            return (
              <li key={`${inci}-${idx}`} className="border-b border-[#E8E8EB]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-3.5 text-left"
                  onClick={() => void router.navigate({ to: detailPath(scanId, encodeURIComponent(inci)) as never })}
                >
                  <div>
                    <p className="text-[15px] font-semibold">{inci}</p>
                    <p className="text-sm text-[#71717A]">{role}</p>
                  </div>
                  <span className={cn("text-xs text-[#71717A]")}>›</span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}