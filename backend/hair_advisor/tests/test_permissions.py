from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User

from hair_advisor.models import ProductCandidate


class HairAdvisorPermissionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="permuser",
            email="perm@t.local",
            phone="+998901234568",
            password="TestPass123!",
            role=User.Role.USER,
        )
        self.client = APIClient()

    def test_admin_approve_denied_for_customer(self):
        cand = ProductCandidate.objects.create(proposed_product_name="X")
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            f"/api/v1/admin/product-verification/candidates/{cand.id}/approve/",
            {},
            format="json",
        )
        self.assertIn(res.status_code, (401, 403))