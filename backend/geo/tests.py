from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIRequestFactory

from geo.services.dgis import geocode_query, reverse_geocode
from geo.views import GeocodeView, ReverseGeocodeView


class DgisServiceTests(SimpleTestCase):
    @override_settings(DGIS_API_KEY="test-key")
    @patch("geo.services.dgis.requests.get")
    def test_geocode_query_parses_result(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "meta": {"code": 200},
                "result": {
                    "items": [
                        {
                            "full_name": "Toshkent, Navoiy ko'chasi, 1",
                            "address_name": "Navoiy ko'chasi, 1",
                            "point": {"lat": 41.31, "lon": 69.27},
                        }
                    ]
                },
            },
        )
        results = geocode_query("Navoiy 1")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].lat, 41.31)
        self.assertEqual(results[0].lng, 69.27)

    @override_settings(DGIS_API_KEY="test-key")
    @patch("geo.services.dgis.requests.get")
    def test_reverse_geocode(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "meta": {"code": 200},
                "result": {
                    "items": [
                        {
                            "full_name": "Toshkent, Navoiy ko'chasi, 1",
                            "address_name": "Navoiy ko'chasi, 1",
                            "point": {"lat": 41.31, "lon": 69.27},
                        }
                    ]
                },
            },
        )
        result = reverse_geocode(41.31, 69.27)
        self.assertIsNotNone(result)
        assert result is not None
        self.assertIn("Navoiy", result.address)


class GeocodeViewTests(SimpleTestCase):
    @override_settings(DGIS_API_KEY="test-key")
    @patch("geo.views.geocode_query")
    def test_geocode_view(self, mock_geocode):
        mock_geocode.return_value = []
        factory = APIRequestFactory()
        request = factory.get("/api/v1/geo/geocode/", {"q": "Toshkent"})
        response = GeocodeView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.data)

    @override_settings(DGIS_API_KEY="test-key")
    @patch("geo.views.reverse_geocode")
    def test_reverse_view(self, mock_reverse):
        from geo.services.dgis import GeocodeResult

        mock_reverse.return_value = GeocodeResult(
            lat=41.31,
            lng=69.27,
            address="Navoiy 1",
            city="Toshkent",
            full_name="Toshkent, Navoiy 1",
        )
        factory = APIRequestFactory()
        request = factory.get("/api/v1/geo/reverse/", {"lat": "41.31", "lng": "69.27"})
        response = ReverseGeocodeView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["address"], "Navoiy 1")
