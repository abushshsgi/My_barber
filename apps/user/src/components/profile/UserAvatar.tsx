import { useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clearMyAvatar, uploadMyAvatar } from "@/lib/api/user";
import { getUserAccessToken } from "@/lib/api/client";
import { getAuthUser, setSession } from "@/lib/auth";
import { meQueryKeyFor } from "@/hooks/use-me";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const NAME_FALLBACKS = new Set(["mehmon", "foydalanuvchi", "guest", "user", "mysaloon"]);

export function userInitials(name?: string | null): string {
  const cleaned = (name || "").trim();
  if (!cleaned || NAME_FALLBACKS.has(cleaned.toLowerCase())) return "M";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  if (parts.length < 2) return first.toUpperCase() || "M";
  return `${first}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

type Props = {
  name?: string | null;
  src?: string | null;
  size?: number;
  editable?: boolean;
  className?: string;
};

export function UserAvatar({ name, src, size = 88, editable = false, className }: Props) {
  const letters = userInitials(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remember = (user: Awaited<ReturnType<typeof uploadMyAvatar>>) => {
    const access = getUserAccessToken();
    const refresh = localStorage.getItem("mybarber_user_refresh");
    if (access && refresh) setSession(access, refresh, user);
    const id = user.id ?? getAuthUser()?.id ?? null;
    void qc.invalidateQueries({ queryKey: meQueryKeyFor(id) });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!TYPES.has(file.type)) {
      setError("Faqat JPG, PNG yoki WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Rasm 5 MB dan katta.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      remember(await uploadMyAvatar(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rasm yuklanmadi");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      remember(await clearMyAvatar());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rasm yuklanmadi");
    } finally {
      setBusy(false);
    }
  };

  const mark = src ? (
    <img
      src={src}
      alt=""
      className="size-full object-cover"
      width={size}
      height={size}
    />
  ) : (
    <DefaultMark letters={letters} />
  );

  const face = (
    <span className="relative block size-full overflow-hidden rounded-full">
      {mark}
      {busy ? (
        <span className="absolute inset-0 grid place-items-center bg-[#1B1045]/45 text-xs font-bold text-white">
          ...
        </span>
      ) : null}
    </span>
  );

  return (
    <div className={className} style={{ width: size, height: size }}>
      {editable ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="block size-full cursor-pointer"
          aria-label="Profil rasmi"
        >
          {face}
        </button>
      ) : (
        face
      )}
      {editable ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {src ? (
            <button
              type="button"
              onClick={() => void remove()}
              className="mt-1 w-full text-center text-[11px] font-semibold text-muted-foreground"
            >
              O‘chirish
            </button>
          ) : null}
          {error ? <p className="mt-1 text-center text-[11px] text-red-600">{error}</p> : null}
        </>
      ) : null}
    </div>
  );
}

function DefaultMark({ letters }: { letters: string }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clip = `avc${raw}`;
  const g1 = `avg1${raw}`;
  const g2 = `avg2${raw}`;
  const g3 = `avg3${raw}`;
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
        <linearGradient id={g1} x1="0" y1="90" x2="100" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFE14A" />
          <stop offset="0.38" stopColor="#FF7A18" />
          <stop offset="0.72" stopColor="#FF4D8D" />
          <stop offset="1" stopColor="#C44BFF" />
        </linearGradient>
        <linearGradient id={g2} x1="10" y1="70" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF5C9A" />
          <stop offset="1" stopColor="#7A3CFF" />
        </linearGradient>
        <linearGradient id={g3} x1="60" y1="70" x2="100" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#B388FF" />
          <stop offset="1" stopColor="#5B2BE0" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="100" height="100" fill="#1B1045" />
        <path
          d="M-8 76 C 16 58, 30 92, 54 78 C 74 66, 84 50, 110 44 L 110 112 L -8 112 Z"
          fill={`url(#${g1})`}
        />
        <path
          d="M-6 92 C 22 74, 46 100, 76 86 C 92 78, 102 70, 112 64 L 112 114 L -6 114 Z"
          fill={`url(#${g2})`}
        />
        <path d="M46 106 C 68 86, 90 98, 114 76 L 114 114 L 46 114 Z" fill={`url(#${g3})`} />
      </g>
      <text
        x="50"
        y="46"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={letters.length > 1 ? 28 : 34}
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {letters}
      </text>
    </svg>
  );
}
