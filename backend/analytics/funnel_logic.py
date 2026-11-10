"""Strict chronological funnel. A stage counts only after the previous one."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta

from analytics.constants import FUNNEL_STAGES, STAGE_LABELS


def best_chain(
    hits: list[tuple[int, datetime, str]],
    window: timedelta,
    cohort_start: datetime,
    cohort_end: datetime,
) -> dict[int, tuple[datetime, str]]:
    ordered = sorted(hits, key=lambda item: (item[1], item[0]))
    anchors = [item for item in ordered if item[0] == 0 and cohort_start <= item[1] < cohort_end]
    best: dict[int, tuple[datetime, str]] = {}
    for _stage, anchor_at, anchor_session in anchors:
        chain = {0: (anchor_at, anchor_session)}
        limit = anchor_at + window
        for stage in range(1, len(FUNNEL_STAGES)):
            previous_at = chain[stage - 1][0]
            nxt = next(
                (
                    item
                    for item in ordered
                    if item[0] == stage and previous_at <= item[1] <= limit
                ),
                None,
            )
            if nxt is None:
                break
            chain[stage] = (nxt[1], nxt[2])
        if len(chain) > len(best):
            best = chain
    return best


def strict_funnel(
    grouped: dict[str, list[tuple[int, datetime, str]]],
    window: timedelta,
    cohort_start: datetime,
    cohort_end: datetime,
) -> list[dict]:
    reached_users: list[set[str]] = [set() for _ in FUNNEL_STAGES]
    reached_sessions: list[set[str]] = [set() for _ in FUNNEL_STAGES]
    deltas: list[list[float]] = [[] for _ in FUNNEL_STAGES]
    for identity, hits in grouped.items():
        chain = best_chain(hits, window, cohort_start, cohort_end)
        if not chain:
            continue
        for stage, (moment, session_key) in chain.items():
            reached_users[stage].add(identity)
            if session_key:
                reached_sessions[stage].add(session_key)
            del moment
        for stage in range(len(chain) - 1):
            if stage + 1 in chain:
                deltas[stage].append((chain[stage + 1][0] - chain[stage][0]).total_seconds())
    rows = []
    first = len(reached_users[0])
    for index, key in enumerate(FUNNEL_STAGES):
        users = len(reached_users[index])
        previous = len(reached_users[index - 1]) if index else None
        drop = (previous - users) if previous is not None else None
        drop_pct = round(drop / previous * 100, 1) if previous else None
        from_prev = round(users / previous * 100, 1) if previous else None
        from_start = round(users / first * 100, 1) if first else None
        samples = deltas[index]
        avg_next = round(sum(samples) / len(samples), 1) if samples else None
        rows.append(
            {
                "key": key,
                "label": STAGE_LABELS[key],
                "unique_users": users,
                "unique_sessions": len(reached_sessions[index]),
                "conversion_from_previous": from_prev,
                "conversion_from_start": from_start if index else (100.0 if first else None),
                "drop_off": drop,
                "drop_off_percent": drop_pct,
                "avg_seconds_to_next": avg_next,
                "identities": reached_users[index],
            }
        )
    return rows


def group_hits(hits: list[tuple[str, int, datetime, str]]) -> dict[str, list[tuple[int, datetime, str]]]:
    grouped: dict[str, list[tuple[int, datetime, str]]] = defaultdict(list)
    for identity, stage, moment, session_key in hits:
        grouped[identity].append((stage, moment, session_key or ""))
    return grouped
