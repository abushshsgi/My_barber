from urllib.parse import urlparse

_SOURCE_MAP = {
    "ig": "instagram",
    "insta": "instagram",
    "instagram": "instagram",
    "fb": "facebook",
    "facebook": "facebook",
    "meta": "facebook",
    "tiktok": "tiktok",
    "tt": "tiktok",
    "google": "google",
    "adwords": "google",
    "youtube": "google",
}

UTM_FIELDS = ("source", "medium", "campaign", "content", "term")


def clean_utm(raw) -> dict[str, str]:
    if not isinstance(raw, dict):
        return {key: "" for key in UTM_FIELDS}
    cleaned = {}
    for key in UTM_FIELDS:
        value = raw.get(key) or raw.get(f"utm_{key}") or ""
        if not isinstance(value, str):
            value = ""
        cleaned[key] = " ".join(value.split())[:120]
    return cleaned


def classify_source(utm_source: str, referrer: str) -> str:
    src = (utm_source or "").strip().lower()
    if src in _SOURCE_MAP:
        return _SOURCE_MAP[src]
    if src:
        return "other"
    host = ""
    if referrer:
        try:
            host = urlparse(referrer).netloc.lower()
        except ValueError:
            host = ""
    if "instagram" in host:
        return "instagram"
    if "facebook" in host or host.endswith("fb.com"):
        return "facebook"
    if "tiktok" in host:
        return "tiktok"
    if "google." in host:
        return "google"
    if host:
        return "referral"
    return "direct"


def apply_attribution(visitor, *, utm: dict, referrer: str, created: bool) -> list[str]:
    """First touch sticks. Last touch updates only when this request has a source signal.

    Blank historical rows are not relabeled as direct.
    """
    fields: list[str] = []
    source_signal = any(utm.values()) or bool(referrer)
    if not source_signal and not created:
        return fields
    source = classify_source(utm.get("source", ""), referrer if source_signal else "")
    if created and not source_signal:
        source = "direct"
    if created or not visitor.first_source:
        visitor.first_source = source
        fields.append("first_source")
        for key in UTM_FIELDS:
            attr = f"first_utm_{key}"
            if utm.get(key) and not getattr(visitor, attr):
                setattr(visitor, attr, utm[key])
                fields.append(attr)
    if source_signal or created:
        visitor.last_source = source
        fields.append("last_source")
        for key in UTM_FIELDS:
            if utm.get(key):
                setattr(visitor, f"last_utm_{key}", utm[key])
                fields.append(f"last_utm_{key}")
    return fields


def device_category(user_agent: str) -> str:
    ua = (user_agent or "").lower()
    if not ua:
        return "unknown"
    if "ipad" in ua or "tablet" in ua:
        return "tablet"
    if "mobile" in ua or "iphone" in ua or "android" in ua:
        return "mobile"
    return "desktop"
