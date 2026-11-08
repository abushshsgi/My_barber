/** Ilova Care hubidagi tezkor va pastki kartochka rasmlari. */

export function CareQuickArt({ kind }: { kind: "sos" | "shelf" | "growth" }) {
  if (kind === "sos") {
    return (
      <svg viewBox="0 0 160 124" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="careQuickSosBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFF4EA" />
            <stop offset="1" stopColor="#F3D2BC" />
          </linearGradient>
          <linearGradient id="careQuickSosGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E39A4A" />
            <stop offset="1" stopColor="#B85E22" />
          </linearGradient>
        </defs>
        <rect width="160" height="124" fill="url(#careQuickSosBg)" />
        <ellipse cx="96" cy="86" rx="22" ry="5" fill="#E2B48A" opacity="0.7" />
        <rect x="78" y="34" width="34" height="48" rx="12" fill="url(#careQuickSosGlass)" />
        <path d="M86 42c2 10 2 22 0 34" stroke="#FFF1DC" strokeWidth="2" opacity="0.45" />
        <rect x="84" y="22" width="22" height="14" rx="3" fill="#1A1A1A" />
        <circle cx="95" cy="18" r="6" fill="#1A1A1A" />
      </svg>
    );
  }
  if (kind === "shelf") {
    return (
      <svg viewBox="0 0 160 124" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="careQuickShelfBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F4FAF5" />
            <stop offset="1" stopColor="#D7EBDD" />
          </linearGradient>
        </defs>
        <rect width="160" height="124" fill="url(#careQuickShelfBg)" />
        <rect x="22" y="72" width="116" height="7" rx="3" fill="#C6A15A" />
        <rect x="34" y="34" width="26" height="38" rx="8" fill="#B7D7C6" />
        <rect x="42" y="26" width="10" height="10" rx="2" fill="#C6A15A" />
        <rect x="70" y="46" width="20" height="26" rx="6" fill="#F6F0E4" />
        <rect x="74" y="40" width="12" height="8" rx="2" fill="#C6A15A" />
        <path d="M102 38h24c2 0 4 2 4 6v22c0 4-2 6-6 6h-20c-2 0-4-2-4-6V42c0-2 1-4 2-4z" fill="#C9E4D4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 160 124" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="careQuickGrowthBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF3E8" />
          <stop offset="1" stopColor="#F4D4BE" />
        </linearGradient>
      </defs>
      <rect width="160" height="124" fill="url(#careQuickGrowthBg)" />
      <path d="M78 96c0-28 8-48 22-68" stroke="#C47A45" strokeWidth="3" fill="none" />
      <circle cx="100" cy="28" r="10" fill="#E7B48A" />
      <path d="M48 88c12-18 28-22 36-6" stroke="#D7A07A" strokeWidth="3" fill="none" />
    </svg>
  );
}

export function CareHubCardArt({ kind }: { kind: "routine" | "scan" }) {
  if (kind === "routine") {
    return (
      <svg viewBox="0 0 200 174" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="careHubRoutineBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F8F3EC" />
            <stop offset="1" stopColor="#E6D3BE" />
          </linearGradient>
          <linearGradient id="careHubSerum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F8E7A8" />
            <stop offset="1" stopColor="#E2C15A" />
          </linearGradient>
        </defs>
        <rect width="200" height="174" fill="url(#careHubRoutineBg)" />
        <circle cx="34" cy="42" r="36" fill="#FFF8F0" opacity="0.85" />
        <rect x="108" y="36" width="28" height="72" rx="10" fill="url(#careHubSerum)" />
        <rect x="114" y="24" width="16" height="16" rx="4" fill="#1A1A1A" />
        <ellipse cx="86" cy="128" rx="46" ry="10" fill="#E7D7C2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 174" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="careHubScanBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4F7FB" />
          <stop offset="1" stopColor="#D5E2F2" />
        </linearGradient>
      </defs>
      <rect width="200" height="174" fill="url(#careHubScanBg)" />
      <rect x="58" y="28" width="84" height="112" rx="14" fill="#FFFFFF" />
      <rect x="72" y="48" width="56" height="6" rx="3" fill="#111111" opacity="0.18" />
      <rect x="72" y="62" width="48" height="6" rx="3" fill="#111111" opacity="0.12" />
      <rect x="72" y="76" width="40" height="6" rx="3" fill="#111111" opacity="0.12" />
      <circle cx="100" cy="112" r="14" fill="none" stroke="#111111" strokeWidth="3" />
    </svg>
  );
}
