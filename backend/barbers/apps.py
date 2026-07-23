from django.apps import AppConfig


class BarbersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "barbers"

    def ready(self):
        from barbers import signals  # noqa: F401

