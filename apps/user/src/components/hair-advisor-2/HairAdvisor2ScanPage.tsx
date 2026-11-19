import { useRouter } from "@tanstack/react-router";
import { ChevronLeft, History, ImageIcon, Loader2, Zap, ZapOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HairAdvisorBarcodeCamera } from "@/components/ai-style/HairAdvisorBarcodeCamera";
import { createHairScan, fetchHairScanHistory, type HairScan } from "@/lib/api/hair-advisor";
import { navigateBack } from "@/lib/mobile-back";
import { prepareSelfieFromFile } from "@/lib/selfie-image";
import { cn } from "@/lib/utils";
import { resolveScanToAnalysis } from "./scan-flow";

type Props = {
  historyPath?: string;
  resultPath: (scanId: string) => string;
};

export function HairAdvisor2ScanPage({
  historyPath = "/ai-style/care/ingredient",
  resultPath,
}: Props) {
  const router = useRouter();
  const lockRef = useRef(false);
  const mounted = useRef(true);
  const [phase, setPhase] = useState<"idle" | "lookup" | "error">("idle");
  const [cameraOn, setCameraOn] = useState(true);
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HairScan[]>([]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      lockRef.current = false;
    };
  }, []);

  const goResult = useCallback(
    (scanId: string) => {
      void router.navigate({ to: resultPath(scanId) as never });
    },
    [resultPath, router],
  );

  const processBarcode = useCallback(
    async (raw: string) => {
      const code = raw.replace(/\D/g, "");
      if (code.length < 8 || lockRef.current) return;
      lockRef.current = true;
      setPhase("lookup");
      setError(null);
      setCameraOn(false);
      try {
        const scan = await createHairScan({
          input_method: "barcode",
          barcode: code,
          idempotency_key: `ha2-${code}`,
        });
        if (scan.status === "product_not_found" || scan.status === "failed") {
          setPhase("error");
          setError(scan.message_uz || scan.error_message || "Mahsulot topilmadi");
          lockRef.current = false;
          setCameraOn(true);
          return;
        }
        const resolved = await resolveScanToAnalysis(scan);
        if ("needIngredients" in resolved) {
          setPhase("error");
          setError("Mahsulotning to'liq tarkibi hali tasdiqlanmagan. Tarkib yorlig'i rasmini yuklang.");
          lockRef.current = false;
          setCameraOn(true);
          return;
        }
        goResult(resolved.scan.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Internet aloqasini tekshiring";
        setPhase("error");
        setError(msg);
        lockRef.current = false;
        setCameraOn(true);
      }
    },
    [goResult],
  );

  const onGallery = async (file: File) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setPhase("lookup");
    setError(null);
    try {
      const dataUrl = await prepareSelfieFromFile(file);
      const scan = await createHairScan({ input_method: "gallery", image: dataUrl });
      const resolved = await resolveScanToAnalysis(scan);
      if ("needIngredients" in resolved) {
        toast.message("Tarkibni tasdiqlash kerak — hozircha QR skanerni ishlating.");
        setPhase("error");
        lockRef.current = false;
        return;
      }
      goResult(resolved.scan.id);
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Rasm o'qilmadi");
      lockRef.current = false;
    }
  };

  const openHistory = async () => {
    try {
      const rows = await fetchHairScanHistory();
      setHistory(rows);
      setHistoryOpen(true);
    } catch {
      toast.error("Tarix yuklanmadi");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#080808] text-white">
      <header
        className="flex items-center justify-between px-5 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          aria-label="Orqaga"
          onClick={() => navigateBack(router, "/ai-style/care")}
          className="inline-flex size-11 items-center justify-center rounded-full text-white"
        >
          <ChevronLeft className="size-6" />
        </button>
        <h1 className="text-[17px] font-semibold tracking-tight">Skanerlash</h1>
        <button
          type="button"
          aria-label="Tarix"
          onClick={() => void openHistory()}
          className="inline-flex size-11 items-center justify-center rounded-full text-white"
        >
          <History className="size-5" />
        </button>
      </header>

      <motionCentered className="px-5">
        <h2 className="text-center text-[26px] font-semibold leading-tight">Mahsulotni skanerlang</h2>
        <p className="mt-2 text-center text-[15px] text-[#A3A3A3]">Shtrix-kodni ramka ichiga joylashtiring</p>

        <div className="relative mx-auto mt-6 w-full max-w-[340px]">
          <HairAdvisorBarcodeCamera
            active={cameraOn}
            embedded
            className="aspect-[3/4] w-full rounded-[22px] border-[#303030]"
            onDetected={(code) => void processBarcode(code)}
            onClose={() => setCameraOn(false)}
          />
          {phase === "lookup" ? (
            <span
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[22px] bg-black/55"
              role="status"
            >
              <Loader2 className="size-8 animate-spin text-white" aria-hidden />
              <span className="text-sm font-medium text-white">Mahsulot qidirilmoqda…</span>
            </span>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 text-center text-sm font-medium text-[#F87171]" role="alert">
            {error}
          </p>
        ) : null}
      </motionCentered>

      <footer
        className="fixed bottom-0 left-0 right-0 flex items-center justify-center gap-10 px-5 pb-8 pt-4"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <label className="inline-flex size-12 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white">
          <ImageIcon className="size-5" />
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onGallery(f);
            }}
          />
        </label>
        <button
          type="button"
          aria-label="Skaner"
          onClick={() => {
            lockRef.current = false;
            setCameraOn(true);
            setPhase("idle");
            setError(null);
          }}
          className="inline-flex size-[58px] items-center justify-center rounded-full bg-white text-[#080808] shadow-lg"
        >
          <span className="size-4 rounded-full border-2 border-[#080808]" />
        </button>
        <button
          type="button"
          aria-label="Chiroq"
          onClick={() => setTorch((v) => !v)}
          className={cn(
            "inline-flex size-12 items-center justify-center rounded-full",
            torch ? "bg-white text-[#080808]" : "bg-white/10 text-white",
          )}
        >
          {torch ? <Zap className="size-5" /> : <ZapOff className="size-5" />}
        </button>
      </footer>

      {historyOpen ? (
        <dialog open className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <motionCard className="max-h-[70vh] w-full max-w-md overflow-y-auto bg-white p-5 text-[#111111]">
            <h3 className="text-lg font-bold">Skanlar tarixi</h3>
            <ul className="mt-3 space-y-2">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl bg-[#F7F7F8] px-3 py-2 text-left text-sm"
                    onClick={() => {
                      setHistoryOpen(false);
                      goResult(h.id);
                    }}
                  >
                    {h.barcode || h.care_product?.name || h.id.slice(0, 8)}
                    <span className="ml-2 text-xs text-[#71717A]">{h.status}</span>
                  </button>
                </li>
              ))}
              {history.length === 0 ? <li className="text-sm text-[#71717A]">Tarix bo'sh</li> : null}
            </ul>
            <button type="button" className="mt-4 w-full rounded-xl border py-2 text-sm font-semibold" onClick={() => setHistoryOpen(false)}>
              Yopish
            </button>
          </motionCard>
        </dialog>
      ) : null}
    </div>
  );
}

function motionCentered({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("pt-4", className)}>{children}</div>;
}

function motionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-[20px]", className)}>{children}</div>;
}