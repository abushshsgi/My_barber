from __future__ import annotations

from urllib.parse import quote


_PALETTE = (
    ("#0f172a", "#2563eb"),
    ("#1f2937", "#7c3aed"),
    ("#3f3f46", "#ec4899"),
    ("#3f3f46", "#f97316"),
    ("#14532d", "#16a34a"),
    ("#1e293b", "#06b6d4"),
)


def build_catalog_service_image(name: str, index: int = 0) -> str:
    primary, accent = _PALETTE[index % len(_PALETTE)]
    title = (name or "Service").strip()[:26]
    subtitle = "MyBarber katalog"
    svg = f"""
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" role="img" aria-label="{title}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{primary}" />
      <stop offset="100%" stop-color="{accent}" />
    </linearGradient>
  </defs>
  <rect width="800" height="520" rx="36" fill="url(#bg)" />
  <circle cx="650" cy="120" r="120" fill="rgba(255,255,255,0.10)" />
  <circle cx="720" cy="420" r="110" fill="rgba(255,255,255,0.08)" />
  <rect x="72" y="78" width="156" height="48" rx="24" fill="rgba(255,255,255,0.14)" />
  <text x="100" y="110" font-family="Inter, Arial, sans-serif" font-size="24" fill="#ffffff">MB</text>
  <text x="72" y="284" font-family="Inter, Arial, sans-serif" font-size="56" font-weight="700" fill="#ffffff">{title}</text>
  <text x="72" y="334" font-family="Inter, Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.82)">{subtitle}</text>
  <path d="M548 170c24 0 43 19 43 43 0 10-4 20-10 28l-87 114c-8 11-20 16-33 16s-25-5-33-16l-87-114a43 43 0 0 1 33-71c16 0 30 9 37 22l12 22 12-22c7-13 21-22 37-22Z" fill="rgba(255,255,255,0.18)" />
  <path d="M425 203l-54 70m42-110-68 88m110 10 80-103m-54 134 84-109" stroke="#ffffff" stroke-width="18" stroke-linecap="round" />
</svg>
""".strip()
    return f"data:image/svg+xml;utf8,{quote(svg)}"
