import { Check, Loader2, ScanLine, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AgentQrScanner } from "@/components/auth/AgentQrScanner";
import { AUTH_INPUT_CLASS } from "@/lib/auth-desktop-variant";
import {
  AGENT_CODE_LENGTH,
  clearStoredAgentRef,
  getStoredAgentRef,
  isCompleteAgentCode,
  normalizeAgentCode,
  parseAgentCodeFromPayload,
  setStoredAgentRef,
} from "@/lib/agent-ref";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";

type CheckResult = {
  valid: boolean;
  code?: string;
  agent_label?: string;
  detail?: string;
};

async function checkAgentCode(code: string): Promise<CheckResult> {
  const url = `${API_BASE}/api/v1/auth/agent-code-check/?code=${encodeURIComponent(code)}`;
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  const body = (await res.json().catch(() => ({}))) as CheckResult & { detail?: string };
  if (!res.ok) {
    return {
      valid: false,
      detail:
        typeof body.detail === "string"
          ? body.detail
          : "Tekshiruv amalga oshmadi. Qayta urinib ko‘ring.",
    };
  }
  return body;
}

export function AgentRefField({ className }: { className?: string }) {
  const [value, setValue] = useState(() => getStoredAgentRef() ?? "");
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [hint, setHint] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const applyValidCode = useCallback(async (code: string, fromScan: boolean) => {
    const normalized = normalizeAgentCode(code);
    if (!isCompleteAgentCode(normalized)) {
      setStatus("bad");
      setHint(`Kod ${AGENT_CODE_LENGTH} belgidan iborat bo‘lishi kerak.`);
      return false;
    }
    setValue(normalized);
    setStatus("checking");
    setHint(null);
    const result = await checkAgentCode(normalized);
    if (result.valid && result.code) {
      setStoredAgentRef(result.code);
      setValue(result.code);
      setStatus("ok");
      setHint(
        result.agent_label
          ? `${result.agent_label} — kod tasdiqlandi`
          : "Agent kodi tasdiqlandi",
      );
      if (fromScan) toast.success("Agent QR o‘qildi");
      return true;
    }
    clearStoredAgentRef();
    setStatus("bad");
    setHint(result.detail || "Agent kodi topilmadi.");
    if (fromScan) toast.error(result.detail || "QR dan agent kodi topilmadi");
    return false;
  }, []);

  useEffect(() => {
    const existing = getStoredAgentRef();
    if (!existing) return;
    setValue(existing);
    void applyValidCode(existing, false);
  }, [applyValidCode]);

  const onChange = (raw: string) => {
    const next = normalizeAgentCode(raw);
    setValue(next);
    if (!next) {
      clearStoredAgentRef();
      setStatus("idle");
      setHint(null);
      return;
    }
    if (!isCompleteAgentCode(next)) {
      setStatus("idle");
      setHint(null);
      return;
    }
    void applyValidCode(next, false);
  };

  const onScan = useCallback(
    (raw: string) => {
      setScannerOpen(false);
      const code = parseAgentCodeFromPayload(raw);
      if (!code) {
        toast.error("Bu QR agent kodi emas. Agent QR yoki 8 belgi kodni skanerlang.");
        return;
      }
      void applyValidCode(code, true);
    },
    [applyValidCode],
  );

  const clear = () => {
    setValue("");
    clearStoredAgentRef();
    setStatus("idle");
    setHint(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="signup-agent-code" className="text-xs font-semibold text-foreground">
          Agent kodi <span className="font-normal text-muted-foreground">(ixtiyoriy)</span>
        </label>
        {value ? (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
            Tozalash
          </button>
        ) : null}
      </div>

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            id="signup-agent-code"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={AGENT_CODE_LENGTH}
            placeholder="Masalan: ABCD2345"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={status === "bad"}
            className={cn(
              AUTH_INPUT_CLASS,
              "font-mono tracking-[0.2em] uppercase",
              status === "ok" && "border-emerald-500/50",
              status === "bad" && "border-destructive/60",
            )}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {status === "checking" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : status === "ok" ? (
              <Check className="size-4 text-emerald-600" />
            ) : null}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="inline-flex h-[50px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground shadow-sm hover:bg-muted active:scale-[0.98]"
          aria-label="Agent QR skanerlash"
        >
          <ScanLine className="size-4" />
          <span className="hidden sm:inline">Skaner</span>
        </button>
      </div>

      {hint ? (
        <p
          className={cn(
            "text-xs",
            status === "ok" && "text-emerald-700",
            status === "bad" && "text-destructive",
            status !== "ok" && status !== "bad" && "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Agent QR ni skanerlang yoki kodini yozing — 3 hafta trial uchun.
        </p>
      )}

      <AgentQrScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={onScan} />
    </div>
  );
}
