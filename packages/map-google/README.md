# @mybarber/map-google

Shared [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) components for user, barber, and admin apps.

## Env

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_GOOGLE_MAPS_API_KEY` | Vercel (user, barber, admin) | Interactive map tiles |
| `GOOGLE_MAPS_API_KEY` | Railway backend | Map config + Geocoder (`/api/v1/geo/*`) |

Enable **Maps JavaScript API** and **Geocoding API** in [Google Cloud Console](https://console.cloud.google.com/google/maps-apis). Restrict the key by HTTP referrer:

- `www.mysaloon.uz/*`
- `partner.mysaloon.uz/*`
- `admin.mysaloon.uz/*`
- `localhost:*/*`

## Exports

- `Map2GIS` — discovery map with markers, user location, fit bounds
- `MapPicker` — center pin for salon / address setup
- `AdminMap2GIS` — admin geo dashboard
