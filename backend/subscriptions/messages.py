"""Obuna xabarlari — uz / ru / en. Kod bilan birga, tanlangan tilda."""

from __future__ import annotations

import math

from rest_framework.exceptions import Throttled

CANCEL_STILL_PREMIUM_MESSAGE = (
    "Obuna bekor qilindi. Premium muddati tugaguncha ishlaydi."
)
CANCEL_BLOCK_REBUY_MESSAGE = (
    "Premium hali faol. Yangi obuna muddat tugagach xarid qilinadi."
)
CANCEL_MISSING_MESSAGE = "Bekor qilish uchun faol obuna topilmadi."
NOT_AN_UPGRADE_MESSAGE = (
    "Joriy tarifdan past yoki teng tarifga o'tib bo'lmaydi. "
    "Yuqori tarifni tanlang."
)
PLAN_CODE_INVALID = "plan_code starter, plus yoki pro bo'lishi kerak."

MESSAGES: dict[str, dict[str, str]] = {
    "plan_code_invalid": {
        "uz": PLAN_CODE_INVALID,
        "ru": "plan_code должен быть starter, plus или pro.",
        "en": "plan_code must be starter, plus, or pro.",
    },
    "cancel_block_rebuy": {
        "uz": CANCEL_BLOCK_REBUY_MESSAGE,
        "ru": "Premium ещё активен. Новую подписку можно купить после окончания срока.",
        "en": "Premium is still active. You can buy again after it ends.",
    },
    "not_an_upgrade": {
        "uz": NOT_AN_UPGRADE_MESSAGE,
        "ru": "Нельзя перейти на такой же или более низкий тариф. Выберите тариф выше.",
        "en": "You can't switch to the same or a lower plan. Choose a higher plan.",
    },
    "cancel_missing": {
        "uz": CANCEL_MISSING_MESSAGE,
        "ru": "Нет активной подписки для отмены.",
        "en": "No active subscription to cancel.",
    },
    "cancel_ok": {
        "uz": CANCEL_STILL_PREMIUM_MESSAGE,
        "ru": "Подписка отменена. Premium работает до конца срока.",
        "en": "Subscription cancelled. Premium stays on until the period ends.",
    },
    "return_url_invalid": {
        "uz": "return_url noto'g'ri.",
        "ru": "Некорректный return_url.",
        "en": "return_url is invalid.",
    },
    "wallet_disabled": {
        "uz": (
            "AI Premium faqat Payme Subscribe orqali to'lanadi. "
            "Hamyon, Click, karta raqami va chek yuklash o'chirilgan."
        ),
        "ru": "AI Premium оплачивается только через Payme. Кошелёк, Click и загрузка чека отключены.",
        "en": "AI Premium is paid only via Payme. Wallet, Click, and receipt upload are off.",
    },
    "method_payme": {
        "uz": "method payme bo'lishi kerak.",
        "ru": "Способ оплаты должен быть payme.",
        "en": "Payment method must be payme.",
    },
    "order_id_required": {
        "uz": "order_id majburiy.",
        "ru": "Нужен order_id.",
        "en": "order_id is required.",
    },
    "payment_not_found": {
        "uz": "To'lov topilmadi.",
        "ru": "Платёж не найден.",
        "en": "Payment not found.",
    },
    "bad_plan": {
        "uz": "Noto'g'ri obuna rejasi.",
        "ru": "Неверный тариф.",
        "en": "Invalid plan.",
    },
    "provider_invalid": {
        "uz": "provider must be click or payme.",
        "ru": "Провайдер должен быть click или payme.",
        "en": "Provider must be click or payme.",
    },
    "order_invalid": {
        "uz": "Noto'g'ri buyurtma identifikatori.",
        "ru": "Неверный идентификатор заказа.",
        "en": "Invalid order id.",
    },
    "price_mismatch": {
        "uz": "Narx mos kelmadi — xavfsizlik tekshiruvi.",
        "ru": "Сумма не совпала — проверка безопасности.",
        "en": "Amount did not match — security check.",
    },
    "payme_pending": {
        "uz": "Payme to'lovi hali tasdiqlanmagan.",
        "ru": "Платёж Payme ещё не подтверждён.",
        "en": "Payme payment is not confirmed yet.",
    },
    "payme_cancelled": {
        "uz": "Payme to'lovi bekor qilingan.",
        "ru": "Платёж Payme отменён.",
        "en": "Payme payment was cancelled.",
    },
    "payme_expired": {
        "uz": "Payme to'lovi muddati o'tgan.",
        "ru": "Срок платежа Payme истёк.",
        "en": "Payme payment expired.",
    },
    "payme_refunded": {
        "uz": "Payme to'lovi qaytarilgan.",
        "ru": "Платёж Payme возвращён.",
        "en": "Payme payment was refunded.",
    },
    "payme_failed": {
        "uz": "Payme to'lovi muvaffaqiyatsiz.",
        "ru": "Платёж Payme не прошёл.",
        "en": "Payme payment failed.",
    },
    "click_disabled": {
        "uz": "AI Premium Click orqali to'lanmaydi. Payme Subscribe ishlating.",
        "ru": "AI Premium не оплачивается через Click. Используйте Payme.",
        "en": "AI Premium can't be paid with Click. Use Payme.",
    },
    "provider_payme": {
        "uz": "provider payme bo'lishi kerak.",
        "ru": "Провайдер должен быть payme.",
        "en": "Provider must be payme.",
    },
    "payment_corrupt": {
        "uz": "To'lov ma'lumotlari buzilgan.",
        "ru": "Данные платежа повреждены.",
        "en": "Payment data is invalid.",
    },
    "payme_amount": {
        "uz": "Payme summasi tarif narxiga teng emas.",
        "ru": "Сумма Payme не совпадает с ценой тарифа.",
        "en": "Payme amount does not match the plan price.",
    },
    "payme_tiyin": {
        "uz": "Payme tiyin hisobi noto'g'ri.",
        "ru": "Неверный расчёт тийин Payme.",
        "en": "Payme tiyin amount is wrong.",
    },
    "payme_zero": {
        "uz": "To'lov summasi 0 bo'lishi mumkin emas.",
        "ru": "Сумма платежа не может быть 0.",
        "en": "Payment amount can't be 0.",
    },
    "payme_no_receipt": {
        "uz": "Payme chek identifikatori qaytmadi.",
        "ru": "Payme не вернул идентификатор чека.",
        "en": "Payme did not return a receipt id.",
    },
    "payme_missing": {
        "uz": "Payme to'lovi topilmadi.",
        "ru": "Платёж Payme не найден.",
        "en": "Payme payment was not found.",
    },
    "payme_no_id": {
        "uz": "Payme chek ID yo'q.",
        "ru": "Нет ID чека Payme.",
        "en": "Payme receipt id is missing.",
    },
    "payme_id_mismatch": {
        "uz": "Payme chek ID mos kelmadi.",
        "ru": "ID чека Payme не совпал.",
        "en": "Payme receipt id did not match.",
    },
    "payme_order_mismatch": {
        "uz": "Payme account.order_id mos kelmadi.",
        "ru": "Payme account.order_id не совпал.",
        "en": "Payme order id did not match.",
    },
    "payme_amount_bad": {
        "uz": "Payme summasi noto'g'ri.",
        "ru": "Неверная сумма Payme.",
        "en": "Payme amount is invalid.",
    },
    "payme_amount_server": {
        "uz": "Payme summasi server narxiga mos kelmadi.",
        "ru": "Сумма Payme не совпала с ценой на сервере.",
        "en": "Payme amount did not match the server price.",
    },
    "payme_state": {
        "uz": "Payme chek holati noto'g'ri.",
        "ru": "Неверный статус чека Payme.",
        "en": "Payme receipt status is invalid.",
    },
    "payme_unconfirmed": {
        "uz": "Payme to'lov holati tasdiqlanmadi.",
        "ru": "Статус платежа Payme не подтверждён.",
        "en": "Payme payment status was not confirmed.",
    },
    "care_plus": {
        "uz": "Morf AI Parvarish Plus obunasida mavjud.",
        "ru": "Уход Morf AI доступен в подписке Plus.",
        "en": "Morf AI Care is available on Plus.",
    },
    "care_pro": {
        "uz": "SOS va Javon faqat Pro obunasida mavjud.",
        "ru": "SOS и Полка доступны только в Pro.",
        "en": "SOS and Shelf are available on Pro only.",
    },
    "subscription_required": {
        "uz": "Generatsiya uchun obuna kerak.",
        "ru": "Для генерации нужна подписка.",
        "en": "A subscription is required to generate.",
    },
    "subscription_or_referral": {
        "uz": (
            "Generatsiya uchun obuna kerak yoki 1 ta do'stingizni taklif qiling "
            "(1 referal = 1 generatsiya)."
        ),
        "ru": "Для генерации нужна подписка или пригласите 1 друга (1 реферал = 1 генерация).",
        "en": "Subscribe or invite 1 friend to generate (1 referral = 1 generation).",
    },
    "voice_required": {
        "uz": "Ovozli suhbat Starter, Plus yoki Pro obunasida mavjud.",
        "ru": "Голосовой чат доступен в подписке Starter, Plus или Pro.",
        "en": "Voice chat is available on Starter, Plus, or Pro.",
    },
    "studio_required": {
        "uz": "Morf AI Studio Plus yoki Pro obunasida mavjud.",
        "ru": "Morf AI Studio доступен в Plus или Pro.",
        "en": "Morf AI Studio is available on Plus or Pro.",
    },
    "plan_no_tryon": {
        "uz": "Bu reja Morf AI generatsiyasini qo'llab-quvvatlamaydi. Tarifni yangilang.",
        "ru": "Этот тариф не включает генерацию Morf AI. Обновите тариф.",
        "en": "This plan doesn't include Morf AI generation. Upgrade your plan.",
    },
    "checkout_throttled": {
        "uz": "Obuna so'rovlari limiti. Biroz kutib qayta urinib ko'ring.",
        "ru": "Слишком много запросов подписки. Подождите и попробуйте снова.",
        "en": "Too many subscription requests. Wait and try again.",
    },
    "confirm_throttled": {
        "uz": "To'lov tasdiqlash limiti. Biroz kutib qayta urinib ko'ring.",
        "ru": "Слишком много попыток подтвердить оплату. Подождите и попробуйте снова.",
        "en": "Too many payment confirmation attempts. Wait and try again.",
    },
    "status_throttled": {
        "uz": "To'lov holati so'rovlari limiti. Biroz kuting.",
        "ru": "Слишком много запросов статуса оплаты. Подождите.",
        "en": "Too many payment status requests. Please wait.",
    },
    "cancel_throttled": {
        "uz": "Obunani bekor qilish limiti. Biroz kutib qayta urinib ko'ring.",
        "ru": "Слишком много попыток отмены. Подождите и попробуйте снова.",
        "en": "Too many cancel attempts. Wait and try again.",
    },
    "ip_throttled": {
        "uz": "Juda ko'p obuna urinishi. Keyinroq qayta urinib ko'ring.",
        "ru": "Слишком много попыток. Попробуйте позже.",
        "en": "Too many attempts. Try again later.",
    },
    "throttled": {
        "uz": "So'rov limiti tugadi. Biroz kutib qayta urinib ko'ring.",
        "ru": "Лимит запросов исчерпан. Подождите и попробуйте снова.",
        "en": "Request limit reached. Wait and try again.",
    },
    "flash_not_new": {
        "uz": "Bu taklif faqat yangi foydalanuvchilar uchun.",
        "ru": "Это предложение только для новых пользователей.",
        "en": "This offer is only for new users.",
    },
    "flash_once": {
        "uz": "1 000 so'mlik rasm faqat 1 marta.",
        "ru": "Снимок за 1 000 сум можно купить только один раз.",
        "en": "The 1,000 som image can be bought only once.",
    },
    "flash_burned": {
        "uz": "30 daqiqa tugadi. 1 000 so'mlik rasm kuyadi.",
        "ru": "30 минут прошли. Снимок за 1 000 сум сгорел.",
        "en": "The 30 minutes are over. The 1,000 som image has expired.",
    },
    "flash_unpaid": {
        "uz": "Try-on uchun avval 1 000 so'm to'lov yoki obuna kerak.",
        "ru": "Для try-on сначала нужна оплата 1 000 сум или подписка.",
        "en": "Try-on needs a 1,000 som payment or a subscription first.",
    },
    "flash_amount": {
        "uz": "Payme summasi 1 000 so'm emas.",
        "ru": "Сумма Payme не равна 1 000 сум.",
        "en": "The Payme amount is not 1,000 som.",
    },
}

_WAIT_MIN = {
    "uz": "Taxminan {n} daqiqadan keyin qayta urinib ko'ring.",
    "ru": "Повторите примерно через {n} мин.",
    "en": "Try again in about {n} min.",
}
_WAIT_SEC = {
    "uz": "Taxminan {n} soniyadan keyin qayta urinib ko'ring.",
    "ru": "Повторите примерно через {n} сек.",
    "en": "Try again in about {n} sec.",
}

EXACT: dict[str, str] = {row["uz"]: code for code, row in MESSAGES.items()}


def request_lang(request) -> str:
    raw = ""
    if request is not None:
        headers = getattr(request, "headers", None)
        if headers is not None:
            raw = headers.get("Accept-Language") or ""
        if not raw:
            meta = getattr(request, "META", None) or {}
            raw = meta.get("HTTP_ACCEPT_LANGUAGE") or ""
    code = str(raw).split(",")[0].split("-")[0].strip().lower()
    if code in ("uz", "ru", "en"):
        return code
    return "uz"


def text(code: str, request=None) -> str:
    row = MESSAGES.get(code) or {}
    lang = request_lang(request)
    return row.get(lang) or row.get("uz") or code


def error_body(code: str, request=None) -> dict[str, str]:
    return {"code": code, "detail": text(code, request)}


def localize_detail(detail: str, request=None) -> dict[str, str]:
    raw = (detail or "").strip()
    code = EXACT.get(raw)
    if not code:
        return {"detail": detail}
    return error_body(code, request)


def raise_localized_throttled(request, wait, code: str) -> None:
    lang = request_lang(request)
    message = text(code, request).rstrip(".")
    detail = message
    wait_s: int | None = None
    if wait is not None:
        wait_s = max(1, math.ceil(float(wait)))
        if wait_s >= 60:
            extra = _WAIT_MIN[lang].format(n=math.ceil(wait_s / 60))
        else:
            extra = _WAIT_SEC[lang].format(n=wait_s)
        detail = f"{message}. {extra}"
    exc = Throttled(detail=detail)
    exc.wait = wait_s
    raise exc
