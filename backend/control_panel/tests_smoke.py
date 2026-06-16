from django.test import TestCase

from wallet.payments import list_available_providers


class ControlPanelSmokeTests(TestCase):
    def test_payment_providers_list_structure(self):
        providers = list_available_providers()
        ids = {p["id"] for p in providers}
        self.assertIn("click", ids)
        self.assertIn("payme", ids)
