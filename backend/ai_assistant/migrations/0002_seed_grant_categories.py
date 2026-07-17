from django.db import migrations

GRANT_CATEGORIES = [
    ("academic-scholarships", "Академические стипендии"),
    ("social-scholarships", "Социальные стипендии"),
    ("science-grants", "Научные гранты"),
    ("startup-grants", "Проектные и стартап-гранты"),
    ("contests-olympiads", "Конкурсы и олимпиады"),
    ("youth-programs", "Молодёжные программы и дотации"),
    ("international-programs", "Международные программы"),
]


def seed_grant_categories(apps, schema_editor):
    GrantCategory = apps.get_model("ai_assistant", "GrantCategory")
    for slug, name in GRANT_CATEGORIES:
        GrantCategory.objects.get_or_create(slug=slug, defaults={"name": name})


class Migration(migrations.Migration):

    dependencies = [
        ("ai_assistant", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_grant_categories, migrations.RunPython.noop),
    ]
