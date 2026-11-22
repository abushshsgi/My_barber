"""Bounded catalog search — never full-table scans."""

from __future__ import annotations

from django.db.models import Q

from ai.models import CareProduct

from .fuzzy import token_ratio
from .normalize import extract_volume_ml, normalize_product_text


def _care_volume_guess(care: CareProduct) -> int | None:
    blob = f"{care.name} {care.brand} {care.ingredients_text or ''}"
    return extract_volume_ml(blob)


def retrieve_catalog_candidates(
    *,
    brand_norm: str = "",
    name_norm: str = "",
    combined_norm: str = "",
    volume_ml: int | None = None,
    limit: int = 12,
) -> list[CareProduct]:
    qs = CareProduct.objects.filter(is_published=True)
    filters: list[Q] = []

    if brand_norm and len(brand_norm) >= 2:
        filters.append(Q(brand__icontains=brand_norm[:40]))
    if name_norm and len(name_norm) >= 2:
        filters.append(Q(name__icontains=name_norm[:60]))
    if not filters and combined_norm:
        tokens = [t for t in combined_norm.split() if len(t) >= 3][:4]
        if tokens:
            token_q = Q()
            for tok in tokens:
                token_q |= Q(name__icontains=tok) | Q(brand__icontains=tok)
            filters.append(token_q)

    if not filters:
        return []

    query = qs.filter(filters[0])
    for extra in filters[1:]:
        query = query.filter(extra)
    rows = list(query.order_by("sort_order", "name")[: limit * 2])

    if len(rows) < 3 and brand_norm:
        extra = list(
            qs.filter(brand__icontains=brand_norm[:40])
            .exclude(pk__in=[r.pk for r in rows])
            .order_by("sort_order", "name")[:limit]
        )
        rows.extend(extra)

    if len(rows) < 3 and name_norm:
        extra = list(
            qs.filter(name__icontains=name_norm[:60])
            .exclude(pk__in=[r.pk for r in rows])
            .order_by("sort_order", "name")[:limit]
        )
        rows.extend(extra)

    if volume_ml and rows:
        scored: list[tuple[float, CareProduct]] = []
        for care in rows[: limit * 2]:
            cv = _care_volume_guess(care)
            vol_penalty = 0.0
            if cv and abs(cv - volume_ml) > 50:
                vol_penalty = 0.15
            base = token_ratio(combined_norm or name_norm, normalize_product_text(f"{care.brand} {care.name}"))
            scored.append((base - vol_penalty, care))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:limit]]

    seen: set[int] = set()
    ordered: list[CareProduct] = []
    for care in rows:
        if care.pk in seen:
            continue
        seen.add(care.pk)
        ordered.append(care)
        if len(ordered) >= limit:
            break
    return ordered


def expand_candidates_if_sparse(
    initial: list[CareProduct],
    signals: dict,
    *,
    limit: int = 12,
) -> list[CareProduct]:
    if len(initial) >= 2:
        return initial[:limit]
    brand = str(signals.get("brand") or "")
    name = str(signals.get("product_name") or "")
    if not brand and not name:
        return initial[:limit]
    broader = retrieve_catalog_candidates(
        brand_norm=normalize_product_text(brand),
        name_norm="",
        combined_norm=normalize_product_text(f"{brand} {name}"),
        volume_ml=signals.get("volume_ml"),
        limit=limit,
    )
    seen = {c.pk for c in initial}
    out = list(initial)
    for care in broader:
        if care.pk not in seen:
            out.append(care)
            seen.add(care.pk)
        if len(out) >= limit:
            break
    return out