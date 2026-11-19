# Hair Advisor — Database migration

## New app

`hair_advisor` adds tables:

- `hair_advisor_hairproduct`
- `hair_advisor_ingredient`
- `hair_advisor_productingredient`
- `hair_advisor_ingredientevidence`
- `hair_advisor_productsource`
- `hair_advisor_hairscan`
- `hair_advisor_hairanalysis`
- `hair_advisor_hairanalysisfeedback`
- `hair_advisor_hairroutine`
- `hair_advisor_hairroutineitem`
- `hair_advisor_productcomparison`

## Migration file

`backend/hair_advisor/migrations/0001_initial.py`

## Local database (Neon auth errors)

If `python manage.py migrate` fails with `password authentication failed for user 'neondb_owner'`, your shell has a stale **`DATABASE_URL`** in `backend/.env` pointing at Neon.

- **Local SQLite:** comment out or remove `DATABASE_URL` in `backend/.env` — Django falls back to `backend/db.sqlite3` (see `config/settings.py`).
- **Production VPS:** keep the real `DATABASE_URL`; do not commit or overwrite secrets.

Never run destructive migrations against production without backup.

## Apply (production)

```bash
cd backend
python manage.py migrate hair_advisor
```

No data is copied automatically from `IngredientScanEntry`. New scans create both `HairScan` and a linked `IngredientScanEntry` on completion.

## Rollback

```bash
python manage.py migrate hair_advisor zero
```

This drops advisor tables only; `ai_careproduct` and scan history in `ai_ingredientscanentry` remain intact.

## Settings

Add to `INSTALLED_APPS`:

```python
"hair_advisor.apps.HairAdvisorConfig",
```

URL mount (already in `config/urls.py`):

```python
path("hair-advisor/", include("hair_advisor.urls")),
```