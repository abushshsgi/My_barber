import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Check } from "lucide-react";
import {
  enhanceImageFile,
  type EnhanceOptions,
} from "@/lib/salon-image-enhance";
import { cn } from "@/lib/utils";

type Props = {
  file: File;
  open: boolean;
  onClose: () => void;
  onConfirm: (file: File) => void;
};

const PRESETS: Array<{ id: NonNullable<EnhanceOptions["preset"]>; label: string; hint: string }> = [
  { id: "none", label: "Asl", hint: "O‘zgartirmasdan" },
  { id: "natural", label: "Tabiiy", hint: "Yumshoq yorug‘lik" },
  { id: "bright", label: "Yorqin", hint: "Salon ichi uchun" },
  { id: "warm", label: "Iliq", hint: "Atmosfera" },
  { id: "crisp", label: "Aniq", hint: "Kontrastli" },
];

export function SalonImageEnhanceDialog({ file, open, onClose, onConfirm }: Props) {
  const [preset, setPreset] = useState<NonNullable<EnhanceOptions["preset"]>>("natural");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [enhanced, setEnhanced] = useState<File | null>(null);

  const originalUrl = useMemo(() => (open ? URL.createObjectURL(file) : null), [file, open]);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setWorking(true);
    void (async () => {
      try {
        const out = await enhanceImageFile(file, { preset });
        if (cancelled) return;
        setEnhanced(out);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(out);
        });
      } finally {
        if (!cancelled) setWorking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, open, preset]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/70 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4" />
            <h2 className="font-heading text-base font-semibold">Rasmni yaxshilash</h2>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            Bekor
          </button>
        </div>

        <div className="relative aspect-[4/3] bg-muted">
          <img
            src={previewUrl || originalUrl || ""}
            alt=""
            className="size-full object-cover"
          />
          {working && (
            <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-5 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={cn(
                  "rounded-lg border px-1 py-2 text-center transition-colors",
                  preset === p.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="text-[11px] font-medium leading-tight">{p.label}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {PRESETS.find((p) => p.id === preset)?.hint}. Mijozlar yorug‘, toza interyer
            rasmlariga ko‘proq ishonadi.
          </p>
          <button
            type="button"
            disabled={working}
            onClick={() => onConfirm(enhanced || file)}
            className="w-full h-11 rounded-xl bg-foreground text-background text-sm font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            <Check className="size-4" />
            Shu rasmni qo‘shish
          </button>
        </div>
      </div>
    </div>
  );
}
