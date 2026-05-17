# MyBarber API (Django)

## Tez boshlash

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # kerakli o‘zgaruvchilarni to‘ldiring
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

## Ma’lumotlar bazasi

| Rejim | Sozlash |
|--------|---------|
| **SQLite (lokal default)** | `.env` da `DATABASE_URL` ni **o‘chirib** qoldiring — fayl: `backend/db.sqlite3` |
| **PostgreSQL (Neon / Railway / boshqalar)** | `DATABASE_URL=postgresql://...` (odatda `?sslmode=require`) |

Yangi migratsiyalar qo‘shilgach:

```bash
python manage.py makemigrations
python manage.py migrate
```

Productionda migratsiyani deploy qadamida bir marta ishlating (Railway Release command yoki CI).

## Testlar

```bash
pip install -r requirements-dev.txt
DJANGO_SETTINGS_MODULE=config.settings pytest -q
```

Agar Postgres test DB (`test_*`) boshqa jarayon bilan band bo‘lsa, parallel `pytest` ishga tushirmang yoki boshqa `DATABASE_URL` ishlating.

## Barber email tasdiq

Ishlab chiqarishda `FRONTEND_BARBER_ORIGIN` (birinchi URL), bitta SMTP (`EMAIL_*`) va `BARBER_FROM_EMAIL` (masalan `verify@mysaloon.uz`) to‘g‘ri bo‘lishi kerak — batafsil `.env.example` ichida.

cPanel/aHost skrinshotidagi **port 2080** — CalDAV (kalendar), SMTP emas. SMTP uchun odatda **465** (SSL) yoki **587** (TLS) va `mail.mysaloon.uz`.
