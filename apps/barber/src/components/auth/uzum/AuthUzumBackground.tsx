/** Uzum Sellers uslubidagi och kulrang fon + yumaloq chiziqlar. */
export function AuthUzumBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#eceef2]" />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.55]"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <path
          d="M-120 520 C 200 380, 420 680, 720 520 S 1180 320, 1560 480"
          stroke="white"
          strokeWidth="72"
          strokeLinecap="round"
        />
        <path
          d="M-80 720 C 280 600, 520 820, 860 680 S 1280 520, 1520 640"
          stroke="white"
          strokeWidth="56"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M200 180 C 400 80, 620 220, 900 120 S 1240 40, 1400 160"
          stroke="white"
          strokeWidth="48"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}
