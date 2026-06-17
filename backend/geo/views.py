from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from geo.services.dgis import DgisGeocoderError, geocode_query, reverse_geocode


class GeocodeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response({"detail": "q must be at least 2 characters."}, status=400)
        try:
            results = geocode_query(q)
        except DgisGeocoderError as exc:
            return Response({"detail": str(exc)}, status=exc.status_code)
        return Response(
            {
                "results": [
                    {
                        "lat": r.lat,
                        "lng": r.lng,
                        "address": r.address,
                        "city": r.city,
                        "full_name": r.full_name,
                    }
                    for r in results
                ]
            }
        )


class ReverseGeocodeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
        except (KeyError, TypeError, ValueError):
            return Response({"detail": "lat and lng are required."}, status=400)
        try:
            result = reverse_geocode(lat, lng)
        except DgisGeocoderError as exc:
            return Response({"detail": str(exc)}, status=exc.status_code)
        if result is None:
            return Response({"detail": "No address found for these coordinates."}, status=404)
        return Response(
            {
                "lat": result.lat,
                "lng": result.lng,
                "address": result.address,
                "city": result.city,
                "full_name": result.full_name,
            }
        )
