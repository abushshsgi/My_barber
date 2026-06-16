"""External payment providers (Click, Payme) — env-gated stubs until credentials are configured."""

from __future__ import annotations

import os
from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

ProviderName = Literal["click", "payme"]


@dataclass(frozen=True)
class PaymentInitResult:
    provider: ProviderName
    checkout_url: str | None
    transaction_id: str
    configured: bool
    message: str


def _provider_configured(name: ProviderName) -> bool:
    if name == "click":
        return bool(os.environ.get("CLICK_MERCHANT_ID", "").strip() and os.environ.get("CLICK_SERVICE_ID", "").strip())
    return bool(os.environ.get("PAYME_MERCHANT_ID", "").strip())


def init_checkout(*, provider: ProviderName, amount: Decimal, order_id: str, return_url: str) -> PaymentInitResult:
    """
    Start a payment session. Production requires provider credentials.
    DEBUG without credentials returns a structured stub (no fake paid status).
    """
    configured = _provider_configured(provider)
    debug = os.environ.get("DJANGO_DEBUG", "true").lower() in ("1", "true", "yes")

    if not configured:
        if debug:
            return PaymentInitResult(
                provider=provider,
                checkout_url=None,
                transaction_id=f"debug-{provider}-{order_id}",
                configured=False,
                message=(
                    f"{provider.upper()} credentials not configured. "
                    "Set env vars and retry, or use wallet DEBUG top-up in development."
                ),
            )
        return PaymentInitResult(
            provider=provider,
            checkout_url=None,
            transaction_id="",
            configured=False,
            message=f"{provider.upper()} payment is not configured on this server.",
        )

    # Credentials present — placeholder until full provider SDK integration.
    base = os.environ.get("PAYMENTS_RETURN_BASE", return_url).rstrip("/")
    return PaymentInitResult(
        provider=provider,
        checkout_url=f"{base}/payments/{provider}/pending?order={order_id}",
        transaction_id=f"{provider}-{order_id}",
        configured=True,
        message="Checkout URL generated (provider handshake TODO).",
    )


def list_available_providers() -> list[dict[str, object]]:
    providers: list[dict[str, object]] = []
    for name in ("click", "payme"):
        configured = _provider_configured(name)  # type: ignore[arg-type]
        providers.append({"id": name, "label": name.upper(), "configured": configured})
    return providers
