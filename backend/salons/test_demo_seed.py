from django.test import SimpleTestCase

from salons.mock.cover_urls import is_mock_salon, mock_cover_cdn_url
from salons.mock.demo_seed import (
    DEMO_BARBERS,
    DEMO_BARBER_COUNT,
    DEMO_BARBERS_PER_CITY,
    DEMO_REGION_BUXORO,
    DEMO_REGION_TOSHKENT,
    DEMO_SALON_COUNT,
    DEMO_SALONS,
    DEMO_SALONS_PER_CITY,
    demo_barber_email,
)


class DemoSeedDataTests(SimpleTestCase):
    def test_counts(self):
        self.assertEqual(len(DEMO_SALONS), DEMO_SALON_COUNT)
        self.assertEqual(len(DEMO_BARBERS), DEMO_BARBER_COUNT)

    def test_unique_salon_names_and_slugs(self):
        self.assertEqual(len({s["slug"] for s in DEMO_SALONS}), DEMO_SALON_COUNT)
        self.assertEqual(len({s["name"] for s in DEMO_SALONS}), DEMO_SALON_COUNT)

    def test_each_barber_owns_at_least_one_salon(self):
        owners = {s["owner_slug"] for s in DEMO_SALONS}
        self.assertEqual(len(owners), DEMO_BARBER_COUNT)

    def test_salons_split_between_toshkent_and_buxoro(self):
        toshkent = [s for s in DEMO_SALONS if s["region"] == DEMO_REGION_TOSHKENT]
        buxoro = [s for s in DEMO_SALONS if s["region"] == DEMO_REGION_BUXORO]
        self.assertEqual(len(toshkent), DEMO_SALONS_PER_CITY)
        self.assertEqual(len(buxoro), DEMO_SALONS_PER_CITY)
        self.assertTrue(all(s["lat"] > 41 for s in toshkent))
        self.assertTrue(all(39.5 < s["lat"] < 40.0 for s in buxoro))

    def test_barbers_split_between_toshkent_and_buxoro(self):
        toshkent = [b for b in DEMO_BARBERS if b["region"] == DEMO_REGION_TOSHKENT]
        buxoro = [b for b in DEMO_BARBERS if b["region"] == DEMO_REGION_BUXORO]
        self.assertEqual(len(toshkent), DEMO_BARBERS_PER_CITY)
        self.assertEqual(len(buxoro), DEMO_BARBERS_PER_CITY)

    def test_salon_owners_match_city(self):
        barber_region = {b["slug"]: b["region"] for b in DEMO_BARBERS}
        for salon in DEMO_SALONS:
            self.assertEqual(barber_region[salon["owner_slug"]], salon["region"])

    def test_demo_barber_emails(self):
        self.assertEqual(demo_barber_email("demo-barber-01"), "demo-barber-01@mysaloon.demo")

    def test_demo_salon_cover_cdn(self):
        salon = type("Salon", (), {"description": "DEMO_MYSALOON: test", "slug": "demo-salon-01", "cover_image": None})()
        self.assertTrue(is_mock_salon(salon))
        self.assertTrue(mock_cover_cdn_url("demo-salon-01").startswith("https://"))
