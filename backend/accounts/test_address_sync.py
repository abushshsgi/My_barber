from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase

from accounts.address_sync import ensure_home_address_from_profile
from accounts.models import User, UserAddress
from accounts.uz_regions import UzRegion
from geo.services.dgis import GeocodeResult


class EnsureHomeAddressTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="u1",
            email="u1@test.local",
            password="pass",
            region=UzRegion.BUXORO,
            latitude=Decimal("39.774700"),
            longitude=Decimal("64.428600"),
            onboarding_completed=True,
        )

    def test_creates_home_address_when_missing(self):
        with patch("accounts.address_sync.reverse_geocode") as mock_reverse:
            mock_reverse.return_value = GeocodeResult(
                lat=39.7747,
                lng=64.4286,
                address="Navoiy ko'chasi",
                city="Buxoro",
                full_name="Buxoro, Navoiy ko'chasi",
            )
            addr = ensure_home_address_from_profile(self.user)
        self.assertIsNotNone(addr)
        assert addr is not None
        self.assertEqual(UserAddress.objects.filter(user=self.user).count(), 1)
        self.assertTrue(addr.is_default)
        self.assertEqual(addr.label, UserAddress.Label.HOME)
        self.assertEqual(addr.region, UzRegion.BUXORO)
        self.assertIn("Buxoro", addr.address_line)

    def test_skips_when_address_exists(self):
        UserAddress.objects.create(
            user=self.user,
            label=UserAddress.Label.HOME,
            address_line="Mavjud manzil",
            region=UzRegion.BUXORO,
            is_default=True,
        )
        self.assertIsNone(ensure_home_address_from_profile(self.user))
        self.assertEqual(UserAddress.objects.filter(user=self.user).count(), 1)

    def test_skips_without_gps(self):
        self.user.latitude = None
        self.user.longitude = None
        self.user.save(update_fields=["latitude", "longitude"])
        self.assertIsNone(ensure_home_address_from_profile(self.user))
        self.assertEqual(UserAddress.objects.filter(user=self.user).count(), 0)
