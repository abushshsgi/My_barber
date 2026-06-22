"""Pexels API — mock salon cover/gallery rasmlari."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

USER_AGENT = "MySaloon/1.0 (+https://mysaloon.uz; mock-seed)"

KIND_QUERIES: dict[str, list[str]] = {
    "barber": ["barber shop", "barbershop haircut", "men haircut barber"],
    "beauty": ["beauty salon", "hair salon women", "makeup hair stylist"],
    "nails": ["nail salon manicure", "gel nails manicure"],
    "spa": ["spa wellness", "spa massage relaxation", "hammam spa"],
}

# API kalitsiz dev fallback — Pexels CDN (barqaror photo id lar).
BUNDLED_PHOTO_IDS: dict[str, list[int]] = {
    "barber": [
        3992859, 3992860, 3992862, 3992863, 3992864, 3992865, 3992866, 3992867,
        3992868, 3992869, 3992870, 3992871, 3992872, 3992873, 3992874, 3992875,
        3992876, 3992877, 3992878, 3992879, 3992880, 3992881, 3992883, 3992884,
        3992885, 3992886, 3992887, 3992889, 3992891, 3992892, 3992893, 3992894,
        3992895, 3992896, 3992897, 3992898, 3992901, 3992902, 3992904, 3992907,
        3992910, 3992911, 3992912, 3992913, 3992914, 3992915, 3992916, 3992917,
        3992918, 3992919, 3992923, 3992924, 3992925, 3992926, 3992927, 3992928,
        3992929, 3992930, 3992931, 3992932, 3992933, 3992934, 3992935, 3992936,
        3992937, 3992938, 3998414, 3998375, 3998377, 3993447, 3993448, 3993449,
        1319460, 1319461, 3272361, 769779, 3785147, 1560862,
    ],
    "beauty": [
        2523205, 2523210, 2523215, 2523220, 2523225, 2523230, 2523235, 2523240,
        2523245, 2523250, 2523255, 2523260, 2523265, 2523270, 2523275, 2523280,
        2523285, 2523290, 2523295, 2523300, 2523305, 2523310, 2523315, 2523320,
        2537564, 834280, 2521943, 1064815, 569111, 3259028, 3288365, 4564265,
        4564260, 4666064, 4043096, 2676392, 6964555, 6974242, 6964536, 5200392,
    ],
    "nails": [
        2866114, 2866115, 2866116, 2866117, 2866118, 2866119, 2866120, 2866121,
        2866122, 2866123, 2866124, 2866125, 2866126, 2866127, 2866128, 2866129,
        5529805, 3181279, 2587157, 865082, 1677561, 865121, 5529803, 2688565,
        2583493, 2688470, 9283145, 498665, 853297, 706514, 373834, 853294,
    ],
    "spa": [
        1453001, 1453005, 1453010, 1453015, 1453020, 1453025, 1453030, 1453035,
        1453040, 1453045, 1453050, 1453055, 1453060, 1453065, 1453070, 1453075,
        335965, 1884166, 936549, 567021, 1327811, 2357980, 3141766, 4108085,
        835468, 2722936, 1612308, 776994, 1929064, 3949746, 5132408, 5382251,
    ],
}


def pexels_cdn_url(photo_id: int, width: int = 1200) -> str:
    return (
        f"https://images.pexels.com/photos/{photo_id}/pexels-photo-{photo_id}.jpeg"
        f"?auto=compress&cs=tinysrgb&w={width}"
    )


def _photo_large_url(photo: dict[str, Any]) -> str:
    src = photo.get("src") or {}
    return src.get("large") or src.get("large2x") or src.get("medium") or pexels_cdn_url(photo["id"])


def _api_search(api_key: str, query: str, page: int = 1, per_page: int = 80) -> list[dict[str, Any]]:
    params = urllib.parse.urlencode(
        {
            "query": query,
            "page": page,
            "per_page": per_page,
            "orientation": "landscape",
        }
    )
    req = urllib.request.Request(
        f"https://api.pexels.com/v1/search?{params}",
        headers={"Authorization": api_key, "User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
    return data.get("photos") or []


def fetch_kind_pool(kind: str, min_count: int, api_key: str | None = None) -> list[str]:
    """Pexels qidiruv yoki bundled id lar — kategoriya bo'yicha URL ro'yxati."""
    api_key = (api_key or os.environ.get("PEXELS_API_KEY", "")).strip()
    urls: list[str] = []
    seen: set[str] = set()

    if api_key:
        for query in KIND_QUERIES.get(kind, ["salon"]):
            for page in range(1, 5):
                if len(urls) >= min_count:
                    break
                try:
                    photos = _api_search(api_key, query, page=page)
                except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError):
                    break
                for photo in photos:
                    url = _photo_large_url(photo)
                    if url in seen:
                        continue
                    seen.add(url)
                    urls.append(url)
                    if len(urls) >= min_count:
                        break

    if len(urls) < min_count:
        for photo_id in BUNDLED_PHOTO_IDS.get(kind, BUNDLED_PHOTO_IDS["barber"]):
            url = pexels_cdn_url(photo_id)
            if url not in seen:
                seen.add(url)
                urls.append(url)
            if len(urls) >= min_count:
                break

    return urls[:min_count]


def download_image(url: str, filename: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()
