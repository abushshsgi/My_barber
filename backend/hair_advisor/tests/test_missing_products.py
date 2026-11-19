from django.test import TestCase

from accounts.models import User
from hair_advisor.models import HairScan, ProductCandidate, ProductSubmission
from hair_advisor.services.missing_products import list_missing_products, missing_products_kpis


def _user(name: str) -> User:
    return User.objects.create_user(
        username=name,
        email=f"{name}@test.local",
        phone=f"+9989{name[-8:].zfill(8)}",
        password="TestPass123!",
        role=User.Role.USER,
    )


class MissingProductsTests(TestCase):
    def test_kpis_reflect_database(self):
        u = _user("missa")
        HairScan.objects.create(user=u, status=HairScan.Status.PRODUCT_NOT_FOUND, barcode="1234567890123")
        kpis = missing_products_kpis()
        self.assertGreaterEqual(kpis["unknown_barcode_scans"], 1)

    def test_list_sorted_by_scans(self):
        u1, u2 = _user("missb"), _user("missc")
        code = "5901234123457"
        for u in (u1, u2, u2):
            HairScan.objects.create(user=u, status=HairScan.Status.PRODUCT_NOT_FOUND, barcode=code)
        ProductSubmission.objects.create(
            user=u1,
            barcode=code,
            submitted_brand="Clear",
            submitted_product_name="Shampoo",
            normalized_ingredients=["Aqua"],
            status=ProductSubmission.Status.SUBMITTED,
        )
        ProductCandidate.objects.create(
            proposed_brand="Clear",
            proposed_product_name="Shampoo",
            proposed_barcode=code,
            submission_count=1,
        )
        data = list_missing_products(sort="most_scans")
        self.assertGreaterEqual(data["total"], 1)
        row = data["results"][0]
        self.assertEqual(row["barcode"], code)
        self.assertEqual(row["scan_count"], 3)
        self.assertEqual(row["unique_users"], 2)