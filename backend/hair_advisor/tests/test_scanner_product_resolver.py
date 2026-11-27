"""Product resolver chain tests — mocked providers, no network / no live DB."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from hair_advisor.services.scanner.product_providers.base import ProductLookupResult
from hair_advisor.services.scanner.product_providers.chain import query_product_providers
from hair_advisor.services.scanner.product_resolver import resolve_product_by_barcode


class _StubProvider:
    def __init__(self, name: str, result: ProductLookupResult | None):
        self.name = name
        self._result = result
        self.calls = 0

    def lookup(self, barcode: str, candidates: list[str]) -> ProductLookupResult | None:
        self.calls += 1
        return self._result


def test_chain_verified_exits_early():
    verified = _StubProvider(
        "verified",
        ProductLookupResult(found=True, tier="verified", barcode="5901234123457", source="verified"),
    )
    external = _StubProvider(
        "obf",
        ProductLookupResult(found=False, tier="unverified", barcode="5901234123457", name="hint"),
    )
    out = query_product_providers("5901234123457", ["5901234123457"], providers=[verified, external])
    assert out.found is True
    assert out.tier == "verified"
    assert verified.calls == 1
    assert external.calls == 0


def test_chain_falls_through_to_external_hint():
    verified = _StubProvider("verified", None)
    external = _StubProvider(
        "obf",
        ProductLookupResult(
            found=False,
            tier="unverified",
            barcode="5901234123457",
            name="External Hint",
            external_hint={"name": "External Hint"},
            source="open_beauty_facts",
        ),
    )
    out = query_product_providers("5901234123457", providers=[verified, external])
    assert out.found is False
    assert out.name == "External Hint"
    assert out.external_hint is not None


def test_chain_not_found():
    a = _StubProvider("a", None)
    b = _StubProvider("b", None)
    out = query_product_providers("5901234123457", providers=[a, b])
    assert out.found is False
    assert out.tier == "unknown"


def test_resolve_invalid_barcode():
    with patch("hair_advisor.services.scanner.product_resolver.cache") as cache:
        cache.get.return_value = None
        out = resolve_product_by_barcode("123")
    assert out["found"] is False
    assert out["error"] == "invalid_barcode"
    assert out["normalized"]["isValid"] is False


def test_resolve_checksum_fail():
    with patch("hair_advisor.services.scanner.product_resolver.cache") as cache:
        cache.get.return_value = None
        out = resolve_product_by_barcode("5901234123450")
    assert out["found"] is False
    assert out["error"] == "invalid_barcode"


def test_resolve_uses_inflight_cache():
    mock_result = ProductLookupResult(found=False, tier="unknown", barcode="5901234123457")
    with patch("hair_advisor.services.scanner.product_resolver.cache") as cache:
        cache.get.return_value = None
        with patch(
            "hair_advisor.services.scanner.product_resolver.query_product_providers",
            return_value=mock_result,
        ) as q:
            first = resolve_product_by_barcode("5901234123457")
            assert first["found"] is False
            assert q.call_count == 1
            # Second call hits short-lived dedup cache
            cache.get.return_value = {k: v for k, v in first.items() if k != "normalized"}
            second = resolve_product_by_barcode("5901234123457")
            assert second["found"] is False
            assert q.call_count == 1


def test_external_negative_cache_skips_network():
    from hair_advisor.services.scanner.product_providers.external import OpenBeautyFactsProvider

    code = "5901234123457"
    with patch("hair_advisor.services.scanner.product_providers.external.cache") as cache:
        cache.get.side_effect = lambda key: 1 if "neg" in key else None
        with patch("ai.services.product_barcode_lookup.fetch_open_beauty_facts") as fetch:
            out = OpenBeautyFactsProvider().lookup(code, [code])
            assert out is None
            fetch.assert_not_called()
