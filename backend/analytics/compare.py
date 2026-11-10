from decimal import Decimal, ROUND_HALF_UP


def compare_numbers(current, previous):
    """Percentage is undefined when the previous value is 0. Unavailable stays null."""
    if current is None or previous is None:
        return {
            "current": current,
            "previous": previous,
            "absolute": None,
            "change_percent": None,
            "change_state": "unavailable",
            "direction": "flat",
        }
    absolute = current - previous
    if previous == 0:
        direction = "flat" if current == 0 else "up" if current > 0 else "down"
        return {
            "current": current,
            "previous": previous,
            "absolute": absolute,
            "change_percent": None,
            "change_state": "undefined",
            "direction": direction,
        }
    pct = (Decimal(current) - Decimal(previous)) / Decimal(previous) * Decimal(100)
    pct = pct.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    direction = "up" if absolute > 0 else "down" if absolute < 0 else "flat"
    return {
        "current": current,
        "previous": previous,
        "absolute": absolute,
        "change_percent": float(pct),
        "change_state": "defined",
        "direction": direction,
    }
