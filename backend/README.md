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

**Railway / boshqa bulut**: tashqi SMTP (465/587) ga ulanish ko‘pincha **timeout** (datacenter blok) beradi — logda `Connection timed out` ko‘rinadi.

1. **`RESEND_API_KEY`** ([resend.com](https://resend.com/), domenni ulang) va `DEFAULT_FROM_EMAIL` / `BARBER_FROM_EMAIL` Resend jadvalida ruxsat etilgan jo‘natuvchi manzil bo‘lsin — kalit mavjud bo‘lsa, backend **Resend HTTP** orqali yuboradi (443).

2. Yoki chiqarilishda ishlayotgan SMTP (`EMAIL_BACKEND` va `EMAIL_*`) — `.env.example` VARIANT B.

`FRONTEND_BARBER_ORIGIN` (oldingi URL — havola shu frontendga qaraydi).

cPanel/aHost skrinshotidagi **port 2080** — CalDAV (kalendar), SMTP emas. SMTP uchun odatda **465** (SSL) yoki **587** (TLS).
