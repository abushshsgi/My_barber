import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, QrCode, ScanLine, ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MobilePageShell } from "@/components/mobile/MobilePageShell";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { Button } from "@/components/ui/button";
import { apiJson } from "@/lib/api/client";
import { formatPrice } from "@/lib/price-display";
import { useWalletBalance, walletMeQueryKeyFor } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";

export const Route = createFileRoute("/wallet_/qr-pay")({
  ssr: false,
  head: () => ({
    meta: [{ title: "QR to'lov — mysaloon.uz" }],
  }),
  component: WalletQrPayRoute,
});

type ResolveResult = {
  public_code: string;
  payload: string;
  barber: { id: number; full_name: string; phone: string };
  request: { id: string; amount: string; note: string; expires_at: string | null } | null;
  min_amount: string;
  max_amount: string;
  account_masked?: string;
};

type PayResult = {
  id: string;
  amount: string;
  barber_name: string;
  status: string;
};

function idemKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `qrpay-${crypto.randomUUID()}`
    : `qrpay-${Date.now()}`;
}

function QrPayPanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { balance } = useWalletBalance();
  const [scannedPayload, setScannedPayload] = useState("");
  const [resolved, setResolved] = useState<ResolveResult | null>(null);
  const [amount, setAmount] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const resolveMut = useMutation({
    mutationFn: async (code: string) =>
      apiJson<ResolveResult>(`/api/v1/wallet/qr-pay/resolve/?code=${encodeURIComponent(code)}`),
    onSuccess: (data) => {
      setResolved(data);
      setScannedPayload(data.payload);
      if (data.request && Number(data.request.amount) > 0) {
        setAmount(String(Math.round(Number(data.request.amount))));
      }
      toast.success(`${data.barber.full_name} topildi`);
    },
    onError: (e: Error & { body?: { detail?: string } }) => {
      toast.error(e.body?.detail || e.message || "QR topilmadi");
      setResolved(null);
      setScannedPayload("");
    },
  });

  const payMut = useMutation({
    mutationFn: async () =>
      apiJson<PayResult>("/api/v1/wallet/qr-pay/", {
        method: "POST",
        headers: { "Idempotency-Key": idemKey() },
        body: JSON.stringify({
          payload: scannedPayload || resolved?.payload,
          amount: amount ? Number(amount) : undefined,
        }),
      }),
    onSuccess: async (data) => {
      toast.success(`To'landi: ${formatPrice(Number(data.amount))} → ${data.barber_name}`);
      setResolved(null);
      setScannedPayload("");
      setAmount("");
      await qc.invalidateQueries({ queryKey: walletMeQueryKeyFor(getAuthUserId()) });
      await qc.invalidateQueries({ queryKey: ["wallet", "transactions"] });
    },
    onError: (e: Error & { body?: { detail?: string } }) => {
      toast.error(e.body?.detail || e.message || "To'lov amalga oshmadi");
    },
  });

  useEffect(() => {
    if (!scanning) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (o?: { formats?: string[] }) => {
          detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]>;
        };
      }
    ).BarcodeDetector;
    if (!Detector) {
      toast.error("Bu brauzerda kamera skaner yo'q. Chrome yoki yangi Safari ishlating.");
      setScanning(false);
      return;
    }
    let stopped = false;
    let raf = 0;
    const detector = new Detector({ formats: ["qr_code"] });
    const start = async () => {
      try {
        const { ensureCameraPermission } = await import("@/lib/native-camera");
        const allowed = await ensureCameraPermission();
        if (!allowed) {
          toast.error("Kameraga ruxsat berilmadi. Sozlamalardan yoqing.");
          setScanning(false);
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const tick = async () => {
          if (stopped || !videoRef.current || videoRef.current.readyState < 2) {
            raf = requestAnimationFrame(() => void tick());
            return;
          }
          try {
            const codes = await detector.detect(videoRef.current);
            for (const c of codes) {
              if (c.rawValue.includes("mysaloon:qrpay:")) {
                stopped = true;
                setScanning(false);
                resolveMut.mutate(c.rawValue);
                return;
              }
            }
          } catch {
            /* skip frame */
          }
          raf = requestAnimationFrame(() => void tick());
        };
        raf = requestAnimationFrame(() => void tick());
      } catch {
        toast.error("Kameraga ruxsat berilmadi");
        setScanning(false);
      }
    };
    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [scanning]);

  const lockedAmount =
    resolved?.request && Number(resolved.request.amount) > 0
      ? Number(resolved.request.amount)
      : null;

  return (
    <div className="space-y-5 pb-8">
      <div className="overflow-hidden rounded-[28px] bg-foreground px-5 py-5 text-background">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-65">Hamyon</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{formatPrice(balance)}</p>
          </div>
          <span className="grid size-10 place-items-center rounded-2xl bg-background/15">
            <ShieldCheck className="size-5" />
          </span>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed opacity-75">
          Faqat sartarosh QR kodini kameradan skanerlab to&apos;lang. Kodni qo&apos;lda yozib
          bo&apos;lmaydi.
        </p>
      </div>

      <div className="rounded-[24px] border border-border bg-card p-4">
        <Button
          type="button"
          className="h-12 w-full rounded-2xl text-sm font-bold"
          variant={scanning ? "secondary" : "default"}
          onClick={() => setScanning((v) => !v)}
        >
          <ScanLine className="mr-2 size-4" />
          {scanning ? "Skanerni to'xtatish" : "QR skanerlash"}
        </Button>

        {scanning ? (
          <div className="relative mt-4 overflow-hidden rounded-[22px] bg-black">
            <video ref={videoRef} className="aspect-[3/4] w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-3xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            <p className="absolute inset-x-0 bottom-3 text-center text-[11px] font-semibold text-white/90">
              QR ni ramka ichiga joylashtiring
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-surface px-4 py-6 text-center">
            <QrCode className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold">Kamerani oching</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Sartarosh ekranidagi MySaloon QR ni skanerlang
            </p>
          </div>
        )}

        {resolveMut.isPending ? (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Tekshirilmoqda…
          </div>
        ) : null}
      </div>

      {resolved ? (
        <div className="space-y-3 rounded-[24px] border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-surface">
              <QrCode className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{resolved.barber.full_name}</p>
              <p className="text-[11px] text-muted-foreground">
                Hisob · {resolved.account_masked || "****"}
              </p>
            </div>
          </div>

          <label className="block text-[11px] font-semibold text-muted-foreground">Summa</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            disabled={lockedAmount != null}
            inputMode="numeric"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-bold tabular-nums disabled:opacity-70"
          />

          <Button
            type="button"
            className="h-11 w-full rounded-2xl font-bold"
            disabled={payMut.isPending || !amount}
            onClick={() => payMut.mutate()}
          >
            {payMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              `To'lash · ${formatPrice(Number(amount || 0))}`
            )}
          </Button>
        </div>
      ) : null}

      <Link
        to="/wallet/top-up"
        className="flex items-center justify-center gap-2 rounded-[18px] border border-border px-3 py-3 text-sm font-bold"
      >
        <Wallet className="size-4" />
        {t("walletPage.topUp", { defaultValue: "Balansni to'ldirish" })}
      </Link>
    </div>
  );
}

function WalletQrPayRoute() {
  const { t } = useTranslation();
  return (
    <DesktopPageSplit
      mobile={
        <MobilePageShell
          title={t("walletPage.title", { defaultValue: "Hamyon" })}
          subtitle="QR to'lov"
          backTo="/wallet"
          strictBack
          flush
        >
          <div className="px-4 pt-2">
            <QrPayPanel />
          </div>
        </MobilePageShell>
      }
      desktop={
        <div className="mx-auto max-w-lg px-6 py-8">
          <h1 className="text-2xl font-semibold tracking-tight">QR to&apos;lov</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Faqat kamera orqali skaner — xavfsiz to&apos;lov.
          </p>
          <div className="mt-6">
            <QrPayPanel />
          </div>
        </div>
      }
    />
  );
}
