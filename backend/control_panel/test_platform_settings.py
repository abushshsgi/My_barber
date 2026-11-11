from django.test import TestCase
from rest_framework.test import APIRequestFactory

from control_panel.models import PlatformSettings
from control_panel.platform_settings_views import SiteConfigView


class SiteConfigViewTests(TestCase):
    def test_public_config_reflects_setting(self):
        row = PlatformSettings.load()
        row.maintenance_banner_enabled = True
        row.save(update_fields=["maintenance_banner_enabled"])

        factory = APIRequestFactory()
        request = factory.get("/api/v1/site/config/")
        response = SiteConfigView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["maintenance_banner_enabled"])

        row.maintenance_banner_enabled = False
        row.save(update_fields=["maintenance_banner_enabled"])
        response = SiteConfigView.as_view()(request)
        self.assertFalse(response.data["maintenance_banner_enabled"])
