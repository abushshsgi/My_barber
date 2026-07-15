from django.db import models


class StoredMedia(models.Model):
    """
    Yuklangan media baytlari — Postgres da (Railway redeploy diskni tozalasa ham saqlanadi).
    ImageField/FileField faqat `name` (yo‘l) ni saqlaydi; kontent shu jadvalda.
    """

    name = models.CharField(max_length=512, unique=True, db_index=True)
    data = models.BinaryField()
    content_type = models.CharField(max_length=128, blank=True, default="application/octet-stream")
    size = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return f"{self.name} ({self.size}b)"
