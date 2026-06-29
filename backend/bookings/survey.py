"""Yandex Go uslubidagi so'rovnoma o'lchovlari (v1, fixed).

Frontend `packages/shared/src/booking-lifecycle.ts` dagi `SURVEY_DIMENSIONS`
bilan bir xil bo'lishi shart.
"""

SURVEY_DIMENSIONS = {
    "barber": [
        {"slug": "politeness", "label": "Sartarosh xushmuomalimi?"},
        {"slug": "tool_cleanliness", "label": "Asbob-uskunalar tozami?"},
        {"slug": "skill", "label": "Kasb mahorati qondirildimi?"},
    ],
    "salon": [
        {"slug": "atmosphere", "label": "Atmosfera yoqdimi?"},
        {"slug": "cleanliness", "label": "Salon toza va hidi yaxshimi?"},
        {"slug": "comfort", "label": "Qulaylik darajasi qanday?"},
    ],
}

DIMENSION_LABELS = {
    (target, item["slug"]): item["label"]
    for target, items in SURVEY_DIMENSIONS.items()
    for item in items
}

VALID_DIMENSIONS = set(DIMENSION_LABELS.keys())
