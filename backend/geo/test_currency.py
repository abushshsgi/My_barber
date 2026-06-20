from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from geo.currency import (
    FALLBACK_UZS_PER_UNIT,
    convert_uzs,
    fetch_live_uzs_per_unit,
    get_latest_exchange_rates,
    sync_exchange_rates,
)
from geo.models import ExchangeRateSnapshot


class CurrencyServiceTests(TestCase):
    def test_convert_uzs_to_usd(self):
        rates = {"UZS": Decimal("1"), "USD": Decimal("12650")}
        self.assertEqual(convert_uzs(126500, "USD", rates), Decimal("10.00"))

    def test_convert_uzs_same_currency(self):
        rates = {"UZS": Decimal("1")}
        self.assertEqual(convert_uzs(50000, "UZS", rates), Decimal("50000.00"))

    @patch("geo.currency.fetch_live_uzs_per_unit")
    def test_sync_creates_snapshot(self, mock_fetch):
        mock_fetch.return_value = (
            {"UZS": Decimal("1"), "USD": Decimal("12000"), "EUR": Decimal("13000")},
            "test",
        )
        snap = sync_exchange_rates(force=True)
        self.assertEqual(snap.source, "test")
        self.assertIn("USD", snap.rates)

    @patch("geo.currency.fetch_live_uzs_per_unit")
    def test_get_latest_auto_sync_when_empty(self, mock_fetch):
        mock_fetch.return_value = (dict(FALLBACK_UZS_PER_UNIT), "fallback")
        snap = get_latest_exchange_rates(auto_sync=True)
        self.assertIsInstance(snap, ExchangeRateSnapshot)

    @patch("geo.currency.fetch_live_uzs_per_unit")
    def test_sync_skips_when_fresh(self, mock_fetch):
        mock_fetch.return_value = (dict(FALLBACK_UZS_PER_UNIT), "fallback")
        first = sync_exchange_rates(force=True)
        second = sync_exchange_rates(force=False)
        self.assertEqual(first.pk, second.pk)
        mock_fetch.assert_called_once()

    @patch("geo.currency.fetch_live_uzs_per_unit")
    def test_sync_refreshes_when_stale(self, mock_fetch):
        mock_fetch.return_value = (dict(FALLBACK_UZS_PER_UNIT), "fallback")
        stale = ExchangeRateSnapshot.objects.create(
            base_currency="UZS",
            rates={"USD": "12000"},
            source="old",
            fetched_at=timezone.now() - timezone.timedelta(days=2),
        )
        fresh = sync_exchange_rates(force=False)
        self.assertNotEqual(stale.pk, fresh.pk)
