# Generated migration to rename approved_at to processed_at

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('approvals', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='approval',
            old_name='approved_at',
            new_name='processed_at',
        ),
    ]
