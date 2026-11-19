from django.core.management.base import BaseCommand

from hair_advisor.services.ingredient_import import sync_ingredients_from_facts


class Command(BaseCommand):
    help = "Import INCI ingredient facts from ai.services.ingredient_facts (versioned internal source)."

    def handle(self, *args, **options):
        stats = sync_ingredients_from_facts()
        self.stdout.write(self.style.SUCCESS(json_dumps(stats)))


def json_dumps(obj):
    import json

    return json.dumps(obj, ensure_ascii=False)