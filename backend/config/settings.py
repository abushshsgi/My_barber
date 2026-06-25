"""
Django settings — MyBarber API.
"""

import hashlib
import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from corsheaders.defaults import default_headers
from django.core.management.utils import get_random_secret_key

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv

    load_dotenv(BASE_DIR / ".env")
except ImportError:
    pass

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", get_random_secret_key())

# HS256 uchun barqaror uzun kalit (qisqa DJANGO_SECRET_KEY ham RFC 7518 / PyJWT talabiga mos).
JWT_HS256_SIGNING_KEY = hashlib.sha256(SECRET_KEY.encode("utf-8")).hexdigest()

WALLET_HMAC_SECRET = os.environ.get("WALLET_HMAC_SECRET", SECRET_KEY)
WALLET_DEBUG_TOPUP_MAX = int(os.environ.get("WALLET_DEBUG_TOPUP_MAX", "1000000"))

DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() in ("1", "true", "yes")

# Request body size limit (DDoS / abuse mitigation)
DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.environ.get("DATA_UPLOAD_MAX_MEMORY_SIZE", str(2 * 1024 * 1024)))
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000


def _build_allowed_hosts() -> list[str]:
    """
    DJANGO_ALLOWED_HOSTS — vergul bilan ro‘yxat.
    API_PUBLIC_HOST — maxsus API domeni (masalan api.mysaloon.uz), DisallowedHost oldini olish uchun.
    RAILWAY_PUBLIC_DOMAIN — Railway default *.railway.app host (platforma beradi).
    """
    chunks: list[str] = []
    raw = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").strip()
    for part in raw.split(","):
        part = part.strip().strip('"').strip("'")
        if part:
            chunks.append(part)
    api_host = os.environ.get("API_PUBLIC_HOST", "").strip().strip('"').strip("'")
    if api_host:
        chunks.append(api_host.lstrip("."))
    railway_domain = os.environ.get("RAILWAY_PUBLIC_DOMAIN", "").strip()
    if railway_domain:
        chunks.append(railway_domain.strip().strip('"').strip("'"))
    seen: set[str] = set()
    out: list[str] = []
    for h in chunks:
        if h and h not in seen:
            seen.add(h)
            out.append(h)
    return out


ALLOWED_HOSTS = _build_allowed_hosts()

# Reverse proxy (Railway / Nginx / Vercel upstream) ortida request.build_absolute_uri()
# https sxemani to'g'ri aniqlashi uchun.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

INSTALLED_APPS = [
    "daphne",
    "channels",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "control_panel.apps.ControlPanelConfig",
    "accounts",
    "barbers.apps.BarbersConfig",
    "salons.apps.SalonsConfig",
    "bookings",
    "notifications",
    "chat",
    "wallet.apps.WalletConfig",
    "ai.apps.AiConfig",
    "geo.apps.GeoConfig",
]

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
DGIS_API_KEY = os.environ.get("DGIS_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
GEMINI_IMAGE_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image").strip() or "gemini-2.5-flash-image"

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "config.middleware.CrossOriginResourcePolicyMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# WebSocket guruhlari: productionda Railway Redis plugin → REDIS_URL
if os.environ.get("REDIS_URL"):
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [os.environ["REDIS_URL"]],
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }

# OTP throttles and phone_auth cache — productionda REDIS_URL bilan bir xil Redis ishlatiladi.
if os.environ.get("REDIS_URL"):
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": os.environ["REDIS_URL"],
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "mysaloon-default",
        }
    }

if os.environ.get("DATABASE_URL"):
    DATABASES = {"default": dj_database_url.config(conn_max_age=600)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
# Lokal / test / production: papka bo‘lmasa WhiteNoise va pytest ogohlantirish beradi.
try:
    STATIC_ROOT.mkdir(parents=True, exist_ok=True)
except OSError:
    pass
# DEBUG=false bo'lsa ham admin CSS ishlashi: collectstatic bo'lmasa, app staticlari topiladi
WHITENOISE_USE_FINDERS = True
if DEBUG:
    STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"
else:
    STATICFILES_STORAGE = "whitenoise.storage.CompressedStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Optional cloud media (production). Default: local MEDIA_ROOT unchanged.
USE_S3_MEDIA = os.environ.get("USE_S3_MEDIA", "").lower() in ("1", "true", "yes")
if USE_S3_MEDIA:
    INSTALLED_APPS.append("storages")
    AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
    AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME", "")
    AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "eu-central-1")
    AWS_S3_CUSTOM_DOMAIN = os.environ.get("AWS_S3_CUSTOM_DOMAIN", "").strip() or None
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            "BACKEND": STATICFILES_STORAGE if not DEBUG else "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
    if AWS_S3_CUSTOM_DOMAIN:
        MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/"
    elif AWS_STORAGE_BUCKET_NAME:
        MEDIA_URL = f"https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com/"

# External payments (Click / Payme) — see wallet/payments.py
CLICK_MERCHANT_ID = os.environ.get("CLICK_MERCHANT_ID", "").strip()
CLICK_SERVICE_ID = os.environ.get("CLICK_SERVICE_ID", "").strip()
CLICK_SECRET_KEY = os.environ.get("CLICK_SECRET_KEY", "").strip()
PAYME_MERCHANT_ID = os.environ.get("PAYME_MERCHANT_ID", "").strip()
PAYME_SECRET_KEY = os.environ.get("PAYME_SECRET_KEY", "").strip()

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "accounts.admin_auth.AdminJWTAuthentication",
        "barbers.barber_auth.BarberJWTAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_THROTTLE_CLASSES": (
        "accounts.throttles.ApiAnonRateThrottle",
        "accounts.throttles.ApiUserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/minute",
        "user": "300/minute",
        "auth": "12/minute",
        "phone_send": "5/minute",
        "phone_send_per_number": "6/hour",
        "phone_verify": "15/minute",
        "phone_verify_per_number": "12/hour",
        "phone_check": "20/minute",
        "barber_check": "15/minute",
        "ai_style": "30/hour",
        "ai_tryon": "12/hour",
        "salon_search": "60/minute",
        "salon_join": "20/minute",
        "wallet_gift": "30/minute",
        "wallet_topup": "20/minute",
        "barber_write": "60/minute",
        "barber_payout": "3/hour",
        "barber_broadcast": "5/day",
        "barber_promo": "20/day",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "SIGNING_KEY": JWT_HS256_SIGNING_KEY,
}

def _normalize_cors_origin(part: str) -> str:
    """Vercel/Railway .env da qo'shtirnoq yoki oxiridagi / tufayli CORS mos kelmasligi oldini olish."""
    part = part.strip().strip('"').strip("'")
    return part.rstrip("/")


def _cors_allowed_origins():
    """
    Har bir frontend uchun alohida o'zgaruvchi (tavsiya):
      FRONTEND_USER_ORIGIN, FRONTEND_ADMIN_ORIGIN, FRONTEND_BARBER_ORIGIN
    Har biri bitta URL yoki vergul bilan bir nechta URL bo'lishi mumkin.
    Qo'shimcha yoki eski deploylar uchun: CORS_ALLOWED_ORIGINS (vergul bilan ro'yxat).
    Hech biri bo'lmasa — lokal dev portlari uchun defaultlar (3000–3003, Vite 5173).
    """
    chunks: list[str] = []
    for key in (
        "FRONTEND_USER_ORIGIN",
        "FRONTEND_ADMIN_ORIGIN",
        "FRONTEND_BARBER_ORIGIN",
    ):
        raw = os.environ.get(key, "").strip()
        if raw:
            for part in raw.split(","):
                part = _normalize_cors_origin(part)
                if part:
                    chunks.append(part)
    legacy = os.environ.get("CORS_ALLOWED_ORIGINS", "").strip()
    if legacy:
        for part in legacy.split(","):
            part = _normalize_cors_origin(part)
            if part:
                chunks.append(part)
    if not chunks:
        chunks = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://localhost:3002",
            "http://127.0.0.1:3002",
            "http://localhost:3003",
            "http://127.0.0.1:3003",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    # Capacitor Android/iOS WebView originlari — productionda ham REST fetch ishlashi uchun.
    chunks.extend(
        [
            "https://localhost",
            "http://localhost",
            "capacitor://localhost",
            "ionic://localhost",
        ]
    )
    seen: set[str] = set()
    out: list[str] = []
    for o in chunks:
        if o not in seen:
            seen.add(o)
            out.append(o)
    return out


CORS_ALLOWED_ORIGINS = _cors_allowed_origins()
CORS_ALLOW_CREDENTIALS = True
# Frontend JWT so'rovlarida X-Session-Id yuboradi — preflight uchun ruxsat kerak.
CORS_ALLOW_HEADERS = (*default_headers, "x-session-id")
# Devda (lokal) Vite/Next preview portlari tez-tez o'zgaradi — CORS bilan blok bo'lmasin.
# Productionda esa yuqoridagi allowlist (FRONTEND_* / CORS_ALLOWED_ORIGINS) ishlaydi.
CORS_ALLOW_ALL_ORIGINS = DEBUG

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()

# Railway / boshqa bulutda SMTP (465/587) tashqi ulanish bilan timeout ko'pincha blok — Resend HTTPS (443).
if RESEND_API_KEY:
    EMAIL_BACKEND = "config.resend_email_backend.ResendEmailBackend"
else:
    EMAIL_BACKEND = os.environ.get(
        "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
    )
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "true").lower() == "true"
EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "false").lower() == "true"
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@mybarber.local")
# Sartarosh email tasdiq xatlari (From — Resend yoki SMTP ikkalasida ham kerak).
BARBER_FROM_EMAIL = os.environ.get("BARBER_FROM_EMAIL", "").strip() or DEFAULT_FROM_EMAIL

# Email tasdiq havolasi (barber frontend). FRONTEND_BARBER_ORIGIN ning birinchi origini ishlatiladi.
def _barber_public_app_base() -> str:
    raw = os.environ.get("FRONTEND_BARBER_ORIGIN", "").strip()
    if raw:
        part = raw.split(",")[0].strip().strip('"').strip("'")
        return part.rstrip("/")
    return "http://localhost:5173"


BARBER_APP_PUBLIC_BASE = _barber_public_app_base()

# Partner mobil ilova (Expo) — email deep link: mysaloonpartner://verify-email?token=...
BARBER_MOBILE_VERIFY_SCHEME = (
    os.environ.get("BARBER_MOBILE_VERIFY_SCHEME", "mysaloonpartner").strip().rstrip("://")
    or "mysaloonpartner"
)

if not DEBUG:
    SECURE_SSL_REDIRECT = os.environ.get("DJANGO_SECURE_SSL_REDIRECT", "true").lower() in (
        "1",
        "true",
        "yes",
    )
    SECURE_HSTS_SECONDS = int(os.environ.get("DJANGO_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    X_FRAME_OPTIONS = "DENY"

