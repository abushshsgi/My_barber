import { Check, Copy, Share2, Star } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { salonCoverGradient } from "@/components/offers/offers-shared";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSalonCoverUrl } from "@/lib/cover-images";
import type { Salon } from "@/lib/mock-data";
import { resolveMediaUrl } from "@/lib/media-url";
import { salonPublicUrl, shareSalon, type ShareSalonResult } from "@/lib/share-salon";
import { cn } from "@/lib/utils";

type ShareSalon = Pick<Salon, "id" | "name" | "address" | "coverUrl" | "coverSeed" | "category" | "rating">;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salon: ShareSalon;
};

function shareText(salon: ShareSalon) {
  return salon.address ? `${salon.name} — ${salon.address}` : salon.name;
}

function telegramShareUrl(url: string, text: string) {
  const params = new URLSearchParams({ url, text });
  return `https://t.me/share/url?${params.toString()}`;
}

function whatsAppShareUrl(url: string, text: string) {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function SalonShareContent({ salon, onDone }: { salon: ShareSalon; onDone?: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [nativeSharing, setNativeSharing] = useState(false);

  const url = salonPublicUrl(salon.id);
  const text = shareText(salon);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const coverSrc = useMemo(() => {
    if (salon.coverUrl) return resolveMediaUrl(salon.coverUrl) ?? salon.coverUrl;
    return getSalonCoverUrl(salon.coverSeed, salon.category);
  }, [salon]);

  const copyLink = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        throw new Error("clipboard unavailable");
      }
      setCopied(true);
    } catch {
      toast.error(t("salon.shareFailed"));
    }
  }, [t, url]);

  const handleNativeShare = async () => {
    setNativeSharing(true);
    try {
      const result: ShareSalonResult = await shareSalon(salon);
      if (result === "copied") {
        setCopied(true);
      } else {
        onDone?.();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(t("salon.shareFailed"));
    } finally {
      setNativeSharing(false);
    }
  };

  const iconBtn =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all active:scale-95";

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-muted/50 to-background">
        <div className="flex gap-3 p-3">
          <div
            className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted shadow-sm"
            style={coverSrc ? undefined : { background: salonCoverGradient(salon.coverSeed) }}
          >
            {coverSrc ? (
              <img src={coverSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <p className="truncate text-base font-bold text-foreground">{salon.name}</p>
            {salon.rating > 0 ? (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Star className="h-3 w-3 fill-foreground text-foreground" />
                {salon.rating.toFixed(1)}
              </p>
            ) : null}
            {salon.address ? (
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{salon.address}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2">
        <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">{url}</p>
        <button
          type="button"
          onClick={() => void copyLink()}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors",
            copied ? "bg-emerald-600 text-white" : "bg-foreground text-background hover:opacity-90",
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? t("salon.shareSheet.copied") : t("salon.shareSheet.copy")}
        </button>
      </div>

      <div>
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("salon.shareSheet.shareVia", { defaultValue: "Ulashish usuli" })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            title={t("salon.shareSheet.copyLink")}
            className={cn(
              iconBtn,
              copied
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>

          <a
            href={telegramShareUrl(url, text)}
            target="_blank"
            rel="noopener noreferrer"
            title={t("salon.shareSheet.telegram")}
            className={cn(iconBtn, "border-transparent bg-[#229ED9] text-white hover:opacity-90")}
          >
            <TelegramIcon className="h-4 w-4" />
          </a>

          <a
            href={whatsAppShareUrl(url, text)}
            target="_blank"
            rel="noopener noreferrer"
            title={t("salon.shareSheet.whatsapp")}
            className={cn(iconBtn, "border-transparent bg-[#25D366] text-white hover:opacity-90")}
          >
            <WhatsAppIcon className="h-4 w-4" />
          </a>

          {canNativeShare ? (
            <button
              type="button"
              onClick={() => void handleNativeShare()}
              disabled={nativeSharing}
              title={t("salon.shareSheet.more")}
              className={cn(
                iconBtn,
                "border-border bg-background text-foreground hover:bg-muted disabled:opacity-60",
              )}
            >
              <Share2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>{t("salon.shareSheet.copyLink")}</span>
          <span>·</span>
          <span>{t("salon.shareSheet.telegram")}</span>
          <span>·</span>
          <span>{t("salon.shareSheet.whatsapp")}</span>
          {canNativeShare ? (
            <>
              <span>·</span>
              <span>{t("salon.shareSheet.more")}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SalonShareSheet({ open, onOpenChange, salon }: Props) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const title = t("salon.shareSheet.title");
  const description = t("salon.shareSheet.subtitle");

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-3xl px-5 pb-8 pt-2">
          <DrawerHeader className="px-0 pb-2 text-left">
            <div className="mb-1 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background">
                <Share2 className="h-3.5 w-3.5" />
              </span>
              <div>
                <DrawerTitle className="text-left text-lg">{title}</DrawerTitle>
                <DrawerDescription className="text-left text-sm">{description}</DrawerDescription>
              </div>
            </div>
          </DrawerHeader>
          <SalonShareContent salon={salon} onDone={() => onOpenChange(false)} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] gap-0 rounded-2xl p-5 sm:rounded-2xl">
        <DialogHeader className="space-y-2 pb-3 text-left">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background">
              <Share2 className="h-3.5 w-3.5" />
            </span>
            <div>
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription className="text-sm">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <SalonShareContent salon={salon} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
