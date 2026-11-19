"""Candidate aggregation when a product submission is finalized."""

from __future__ import annotations

import hashlib
from collections import Counter
from typing import Any

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from hair_advisor.models import (
    CandidateSubmission,
    ProductCandidate,
    ProductConflict,
    ProductSubmission,
    ProductVerificationAlert,
)
from hair_advisor.services.ingredient_engine import normalize_ingredient_list
from hair_advisor.services.matching import compare_submission_to_candidate


def _fingerprint_submission(sub: ProductSubmission) -> str:
    ing = sub.user_corrected_ingredients or sub.normalized_ingredients
    blob = f"{sub.user_id}|{sub.barcode}|{'|'.join(ing)}"
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:32]


def _inci_consensus_key(ingredients: list[str]) -> str:
    norm = sorted(x.lower() for x in normalize_ingredient_list(ingredients))
    if not norm:
        return ""
    return hashlib.sha256(",".join(norm).encode("utf-8")).hexdigest()[:16]


def _field_consensus(submissions: list[ProductSubmission]) -> dict[str, Any]:
    evidence: dict[str, Any] = {"fields": {}, "inci_lists": {}}
    counters: dict[str, Counter] = {
        "brand": Counter(),
        "name": Counter(),
        "variant": Counter(),
        "barcode": Counter(),
        "size": Counter(),
    }
    inci_groups: dict[str, list[str]] = {}

    for sub in submissions:
        if sub.submitted_brand:
            counters["brand"][sub.submitted_brand.strip()] += 1
        if sub.submitted_product_name:
            counters["name"][sub.submitted_product_name.strip()] += 1
        if sub.submitted_variant:
            counters["variant"][sub.submitted_variant.strip()] += 1
        if sub.barcode:
            counters["barcode"][sub.barcode.strip()] += 1
        if sub.product_size:
            counters["size"][sub.product_size.strip()] += 1
        ing = sub.user_corrected_ingredients or sub.normalized_ingredients
        key = _inci_consensus_key(ing)
        if key:
            inci_groups.setdefault(key, normalize_ingredient_list(ing))

    for field, counter in counters.items():
        if not counter:
            continue
        top, count = counter.most_common(1)[0]
        evidence["fields"][field] = {"value": top, "submission_count": count}

    if inci_groups:
        ranked = sorted(
            inci_groups.items(),
            key=lambda item: sum(
                1
                for s in submissions
                if _inci_consensus_key(s.user_corrected_ingredients or s.normalized_ingredients) == item[0]
            ),
            reverse=True,
        )
        evidence["inci_lists"] = {k: v for k, v in inci_groups.items()}
        evidence["inci_consensus_key"] = ranked[0][0]
        if len(ranked) > 1:
            evidence["inci_alternate_keys"] = [k for k, _ in ranked[1:]]

    return evidence


def _create_alert(candidate: ProductCandidate, alert_type: str, title: str, body: str = "") -> None:
    recent = ProductVerificationAlert.objects.filter(
        candidate=candidate,
        alert_type=alert_type,
        created_at__gte=timezone.now() - timezone.timedelta(hours=6),
    ).exists()
    if recent:
        return
    ProductVerificationAlert.objects.create(
        alert_type=alert_type,
        candidate=candidate,
        title=title,
        body=body,
        payload={"candidate_id": str(candidate.id)},
    )


@transaction.atomic
def aggregate_submission(submission: ProductSubmission) -> ProductCandidate:
    fp = _fingerprint_submission(submission)
    if fp and submission.content_fingerprint != fp:
        submission.content_fingerprint = fp
        submission.save(update_fields=["content_fingerprint", "updated_at"])

    dup = (
        ProductSubmission.objects.filter(user=submission.user, content_fingerprint=fp)
        .exclude(pk=submission.pk)
        .first()
    )
    dup_link = CandidateSubmission.objects.filter(submission=dup).first() if dup else None
    if dup_link:
        existing = dup_link.candidate
        CandidateSubmission.objects.get_or_create(
            candidate=existing,
            submission=submission,
            defaults={"match_stage": "dedup", "match_score": 1.0},
        )
        submission.status = ProductSubmission.Status.LINKED
        submission.save(update_fields=["status", "updated_at"])
        ProductCandidate.objects.filter(pk=existing.pk).update(
            submission_count=F("submission_count") + 1,
            updated_at=timezone.now(),
        )
        return existing

    open_statuses = [
        ProductCandidate.Status.OPEN,
        ProductCandidate.Status.NEEDS_REVIEW,
        ProductCandidate.Status.CONFLICT,
    ]
    candidates = list(ProductCandidate.objects.filter(status__in=open_statuses)[:200])

    best: ProductCandidate | None = None
    best_meta: dict[str, Any] = {}
    for cand in candidates:
        meta = compare_submission_to_candidate(submission, cand)
        if not meta.get("stage"):
            continue
        if meta["score"] > best_meta.get("score", 0):
            best = cand
            best_meta = meta

    if best is None:
        evidence = _field_consensus([submission])
        brand = evidence.get("fields", {}).get("brand", {}).get("value", submission.submitted_brand)
        name = evidence.get("fields", {}).get("name", {}).get("value", submission.submitted_product_name)
        cand = ProductCandidate.objects.create(
            proposed_brand=brand or "",
            proposed_product_name=name or "",
            proposed_variant=submission.submitted_variant or "",
            proposed_barcode=submission.barcode or "",
            proposed_size=submission.product_size or "",
            proposed_field_evidence=evidence,
            submission_count=1,
            admin_review_priority=10,
        )
        CandidateSubmission.objects.create(
            candidate=cand,
            submission=submission,
            match_stage="new",
            match_score=1.0,
        )
        submission.status = ProductSubmission.Status.LINKED
        submission.save(update_fields=["status", "updated_at"])
        _create_alert(cand, ProductVerificationAlert.AlertType.NEW_CANDIDATE, "Yangi mahsulot nomzodi", name or "")
        return cand

    CandidateSubmission.objects.create(
        candidate=best,
        submission=submission,
        match_stage=best_meta.get("stage") or "",
        match_score=float(best_meta.get("score") or 0),
    )
    submission.status = ProductSubmission.Status.LINKED
    submission.save(update_fields=["status", "updated_at"])

    links = list(
        CandidateSubmission.objects.filter(candidate=best).select_related("submission")
    )
    subs = [link.submission for link in links]
    evidence = _field_consensus(subs)
    conflicts = list(best.conflicting_fields or [])
    conflicting_ingredients = False

    if len(evidence.get("inci_lists", {})) > 1:
        conflicting_ingredients = True
        conflicts.append({"field": "inci", "lists": list(evidence["inci_lists"].keys())})
        ProductConflict.objects.create(
            candidate=best,
            conflict_type=ProductConflict.ConflictType.INCI_MISMATCH,
            field_name="inci",
            values=[evidence["inci_lists"][k][:8] for k in evidence["inci_lists"]],
            submission_ids=[str(s.id) for s in subs],
        )

    if best_meta.get("conflicts"):
        for c in best_meta["conflicts"]:
            conflicts.append({"code": c})

    status = best.status
    if conflicting_ingredients:
        status = ProductCandidate.Status.CONFLICT
        _create_alert(
            best,
            ProductVerificationAlert.AlertType.INCI_CONFLICT,
            "Ingredient ro'yxatida nomuvofiqlik",
            best.proposed_product_name,
        )
    elif len(subs) >= 3:
        _create_alert(
            best,
            ProductVerificationAlert.AlertType.SUBMISSION_BURST,
            f"{len(subs)} ta mos topshiruv",
            best.proposed_product_name,
        )

    priority = min(100, 10 + len(subs) * 5 + (20 if conflicting_ingredients else 0))
    ProductCandidate.objects.filter(pk=best.pk).update(
        proposed_field_evidence=evidence,
        proposed_brand=evidence.get("fields", {}).get("brand", {}).get("value", best.proposed_brand),
        proposed_product_name=evidence.get("fields", {}).get("name", {}).get("value", best.proposed_product_name),
        proposed_barcode=evidence.get("fields", {}).get("barcode", {}).get("value", best.proposed_barcode),
        proposed_size=evidence.get("fields", {}).get("size", {}).get("value", best.proposed_size),
        submission_count=len(subs),
        conflicting_fields=conflicts,
        status=status,
        admin_review_priority=priority,
        updated_at=timezone.now(),
    )
    best.refresh_from_db()
    return best