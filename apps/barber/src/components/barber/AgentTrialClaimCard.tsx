import { Check, Gift, Loader2, ScanLine, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AgentQrScanner } from "@/components/auth/AgentQrScanner";
import {
  AGENT_CODE_LENGTH,
  isCompleteAgentCode,
  normalizeAgentCode,
  parseAgentCodeFromPayload,
} from "@/lib/agent-ref";
import { API_BASE } from "@/lib/api";
import type { AgentTrialStatus } from "@/lib/shop-subscription";
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

type Props = {
  trial: AgentTrialStatus | null | undefined;
  busy?: boolean;
  onClaim: (agentCode: string) => Promise<void>;
};

export function AgentTrialClaimCard({ trial, busy, onClaim }: Props) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [hint, setHint] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const eligible = Boolean(trial?.eligible);
  const alreadyUsed = Boolean(trial?.already_used);
  const days = trial?.trial_days ?? 21;

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
    setStatus("bad");
    setHint(result.detail || "Agent kodi topilmadi.");
    if (fromScan) toast.error(result.detail || "QR dan agent kodi topilmadi");
    return false;
  }, []);

  const onChange = (raw: string) => {
    const next = normalizeAgentCode(raw);
    setValue(next);
    if (!next) {
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
    setStatus("idle");
    setHint(null);
  };

  async function submit() {
    const code = normalizeAgentCode(value);
    if (!isCompleteAgentCode(code) || status !== "ok") {
      toast.error("Avval to‘g‘ri agent kodini kiriting yoki skanerlang.");
      return;
    }
    setSubmitting(true);
    try {
      await onClaim(code);
      clear();
    } finally {
      setSubmitting(false);
    }
  }

  if (alreadyUsed && trial?.grant) {
    return (
      <div className="rounded-2xl border border-border bg-card/80 px-4 py-4 sm:px-5 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Gift className="size-4" />
          Agent trial
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Bepul trial allaqachon ishlatilgan
          {trial.grant.ends_at
            ? ` (tugash: ${new Date(trial.grant.ends_at).toLocaleDateString("uz-UZ", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })})`
            : ""}
          . Har bir partner uchun faqat bir marta beriladi.
        </p>
      </div>
    );
  }

  if (!eligible) {
    return null;
  }

  const locked = busy || submitting;

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-4 sm:px-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-800">
          <Gift className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Agent taklif kodi — {days} kun bepul</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Agent QR ni skanerlang yoki kodini yozing. To‘g‘ri bo‘lsa Start paneli {days} kunga
            ochiladi. Har bir partner uchun faqat bir marta.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            id="subscription-agent-code"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={AGENT_CODE_LENGTH}
            placeholder="Taklif kodi (8 belgi)"
            value={value}
            disabled={locked}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={status === "bad"}
            className={cn(
              "h-[50px] w-full rounded-xl border border-border bg-background px-3 font-mono text-sm tracking-[0.2em] uppercase shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
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
        {value ? (
          <button
            type="button"
            disabled={locked}
            onClick={clear}
            className="inline-flex h-[50px] w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground disabled:opacity-60"
            aria-label="Tozalash"
          >
            <X className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          disabled={locked}
          onClick={() => setScannerOpen(true)}
          className="inline-flex h-[50px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-sm font-semibold shadow-sm hover:bg-muted active:scale-[0.98] disabled:opacity-60"
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
      ) : null}

      <button
        type="button"
        disabled={locked || status !== "ok"}
        onClick={() => void submit()}
        className={cn(
          "w-full h-11 rounded-xl text-sm font-semibold transition-all",
          "bg-foreground text-background hover:opacity-90",
          (locked || status !== "ok") && "opacity-60 cursor-not-allowed",
        )}
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Faollashtirilmoqda…
          </span>
        ) : (
          `${days} kunlik trialni olish`
        )}
      </button>

      <AgentQrScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={onScan} />
    </div>
  );
}
