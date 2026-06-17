# @mybarber/map-2gis

Shared [2GIS MapGL JS](https://docs.2gis.com/en/mapgl/overview) components for user, barber, and admin apps.

## Env

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_DGIS_API_KEY` | Vercel (user, barber, admin) | Interactive map tiles |
| `DGIS_API_KEY` | Railway backend | Geocoder proxy (`/api/v1/geo/*`) |

Restrict API keys in [2GIS Platform Manager](https://platform.2gis.com/) to:

- `www.mysaloon.uz`
- `partner.mysaloon.uz`
- `admin.mysaloon.uz`
- `localhost`

## Exports

- `Map2GIS` — discovery map with markers, user location, fit bounds
- `MapPicker` — draggable center pin for salon setup
- `AdminMap2GIS` — admin geo dashboard
