from django.db import models


class ExchangeRateSnapshot(models.Model):
    """Valyuta kurslari — bazaviy UZS, kunlik yangilanadi."""

    base_currency = models.CharField(max_length=3, default="UZS")
    # Har bir valyuta uchun: 1 birlik = N so'm (masalan USD: 12650)
    rates = models.JSONField(default=dict)
    source = models.CharField(max_length=64, default="fallback")
    fetched_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fetched_at"]

    def __str__(self) -> str:
        return f"{self.base_currency} @ {self.fetched_at:%Y-%m-%d %H:%M}"
