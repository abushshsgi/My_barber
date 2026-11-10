"""Stable analytics event names. Version 1.

Financial outcomes are server-only. Public ingest rejects them.
"""

EVENT_VERSION = 1

CLIENT_EVENTS = frozenset(
    {
        "page_view",
        "session_start",
        "registration_started",
        "registration_completed",
        "login_completed",
        "premium_page_viewed",
        "premium_offer_viewed",
        "subscription_plan_selected",
        "subscribe_clicked",
        "payment_initiated",
        "checkout_redirect_attempted",
        "payme_return_viewed",
        "ai_tryon_opened",
        "ai_style_selected",
        "ai_generation_requested",
        "ai_generation_completed",
        "ai_generation_failed",
        "catalog_opened",
        "shampoo_product_viewed",
        "barcode_scan_started",
        "barcode_scan_completed",
    }
)

SERVER_EVENTS = frozenset(
    {
        "payment_transaction_created",
        "payment_pending",
        "payment_confirmed",
        "payment_failed",
        "payment_cancelled",
        "payment_expired",
        "payment_refunded",
        "payment_completed_without_activation",
        "subscription_activated",
        "subscription_activation_failed",
        "duplicate_payment_verification",
    }
)

FORBIDDEN_CLIENT_EVENTS = SERVER_EVENTS

FUNNEL_STAGES = (
    "website_visited",
    "account_registered",
    "premium_page_viewed",
    "premium_offer_viewed",
    "subscription_plan_selected",
    "subscribe_clicked",
    "payment_initiated",
    "payment_transaction_created",
    "checkout_redirect_attempted",
    "payment_pending",
    "payment_confirmed",
    "subscription_activated",
)

STAGE_LABELS = {
    "website_visited": "Saytga tashrif",
    "account_registered": "Ro'yxatdan o'tgan",
    "premium_page_viewed": "Premium sahifa",
    "premium_offer_viewed": "Taklif ko'rilgan",
    "subscription_plan_selected": "Tarif tanlangan",
    "subscribe_clicked": "Obuna tugmasi",
    "payment_initiated": "To'lov so'rovi",
    "payment_transaction_created": "Tranzaksiya yaratilgan",
    "checkout_redirect_attempted": "Checkoutga yo'naltirish urinishi",
    "payment_pending": "To'lov kutilmoqda",
    "payment_confirmed": "To'lov tasdiqlangan",
    "subscription_activated": "Obuna yoqilgan",
}

# Stages that cannot be rebuilt from older tables.
UNAVAILABLE_BEFORE_TRACKING = frozenset(
    {
        "premium_offer_viewed",
        "subscription_plan_selected",
        "subscribe_clicked",
        "checkout_redirect_attempted",
        "payme_return_viewed",
    }
)

SOURCE_KEYS = ("instagram", "facebook", "tiktok", "google", "direct", "referral", "other", "unknown")

ENGAGEMENT_EVENTS = frozenset(
    {
        "premium_page_viewed",
        "premium_offer_viewed",
        "subscription_plan_selected",
        "subscribe_clicked",
        "payment_initiated",
        "checkout_redirect_attempted",
        "ai_tryon_opened",
        "ai_style_selected",
        "ai_generation_requested",
        "ai_generation_completed",
        "catalog_opened",
        "shampoo_product_viewed",
        "barcode_scan_started",
        "barcode_scan_completed",
        "registration_started",
        "registration_completed",
        "login_completed",
    }
)
