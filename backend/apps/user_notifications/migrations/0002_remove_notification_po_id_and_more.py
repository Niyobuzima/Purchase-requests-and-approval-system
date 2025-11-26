import django.db.models.deletion
from django.db import migrations, models


def get_existing_columns(cursor):
    """Get set of existing column names for the notification table"""
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'user_notifications_notification'
    """)
    return {row[0] for row in cursor.fetchall()}


def table_exists(cursor, table_name):
    """Check if a table exists in the database"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = %s
        )
    """, [table_name])
    return cursor.fetchone()[0]


def idempotent_migration(apps, schema_editor):
    """
    Perform all schema changes idempotently.
    This handles any database state: fresh, partial, or already migrated.
    """
    connection = schema_editor.connection

    with connection.cursor() as cursor:
        existing_columns = get_existing_columns(cursor)

        # Step 1: Rename old integer columns if they exist
        renames = [
            ('po_id', 'old_po_id'),
            # Note: request_id and receipt_id have same names as new FK columns
            # Only rename if they're IntegerFields (check by seeing if FK constraint exists)
        ]

        for old_name, new_name in renames:
            if old_name in existing_columns and new_name not in existing_columns:
                cursor.execute(
                    f'ALTER TABLE user_notifications_notification RENAME COLUMN "{old_name}" TO "{new_name}"'
                )

        # Refresh columns after renames
        existing_columns = get_existing_columns(cursor)

        # Step 2: Handle request_id - might be old IntegerField or already a FK
        # Check if it's a FK by looking for constraints
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'user_notifications_notification'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'request_id'
        """)
        request_id_is_fk = cursor.fetchone()[0] > 0

        if 'request_id' in existing_columns and not request_id_is_fk:
            # It's an old integer column, rename it
            if 'old_request_id' not in existing_columns:
                cursor.execute(
                    'ALTER TABLE user_notifications_notification RENAME COLUMN "request_id" TO "old_request_id"'
                )

        # Same for receipt_id
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'user_notifications_notification'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'receipt_id'
        """)
        receipt_id_is_fk = cursor.fetchone()[0] > 0

        if 'receipt_id' in existing_columns and not receipt_id_is_fk:
            # It's an old integer column, rename it
            if 'old_receipt_id' not in existing_columns:
                cursor.execute(
                    'ALTER TABLE user_notifications_notification RENAME COLUMN "receipt_id" TO "old_receipt_id"'
                )

        # Refresh columns
        existing_columns = get_existing_columns(cursor)

        # Step 3: Add new FK columns if they don't exist
        if 'purchase_order_id' not in existing_columns:
            cursor.execute("""
                ALTER TABLE user_notifications_notification
                ADD COLUMN purchase_order_id BIGINT NULL
            """)

        if 'receipt_id' not in existing_columns:
            cursor.execute("""
                ALTER TABLE user_notifications_notification
                ADD COLUMN receipt_id BIGINT NULL
            """)

        if 'request_id' not in existing_columns:
            cursor.execute("""
                ALTER TABLE user_notifications_notification
                ADD COLUMN request_id BIGINT NULL
            """)

        # Step 4: Add FK constraints if tables exist and constraints don't
        cursor.execute("""
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'user_notifications_notification'
            AND constraint_type = 'FOREIGN KEY'
        """)
        existing_constraints = {row[0] for row in cursor.fetchall()}

        if table_exists(cursor, 'purchase_orders_purchaseorder'):
            fk_name = 'user_notifi_purchase_order_fk'
            if fk_name not in existing_constraints:
                try:
                    cursor.execute(f"""
                        ALTER TABLE user_notifications_notification
                        ADD CONSTRAINT {fk_name}
                        FOREIGN KEY (purchase_order_id)
                        REFERENCES purchase_orders_purchaseorder(id)
                        ON DELETE SET NULL
                    """)
                except Exception:
                    pass

        if table_exists(cursor, 'receipts_receipt'):
            fk_name = 'user_notifi_receipt_fk'
            if fk_name not in existing_constraints:
                try:
                    cursor.execute(f"""
                        ALTER TABLE user_notifications_notification
                        ADD CONSTRAINT {fk_name}
                        FOREIGN KEY (receipt_id)
                        REFERENCES receipts_receipt(id)
                        ON DELETE SET NULL
                    """)
                except Exception:
                    pass

        if table_exists(cursor, 'purchase_requests_purchaserequest'):
            fk_name = 'user_notifi_request_fk'
            if fk_name not in existing_constraints:
                try:
                    cursor.execute(f"""
                        ALTER TABLE user_notifications_notification
                        ADD CONSTRAINT {fk_name}
                        FOREIGN KEY (request_id)
                        REFERENCES purchase_requests_purchaserequest(id)
                        ON DELETE SET NULL
                    """)
                except Exception:
                    pass

        # Step 5: Migrate data from old columns to new FK columns
        existing_columns = get_existing_columns(cursor)

        if 'old_request_id' in existing_columns and 'request_id' in existing_columns:
            if table_exists(cursor, 'purchase_requests_purchaserequest'):
                cursor.execute("""
                    UPDATE user_notifications_notification n
                    SET request_id = n.old_request_id
                    WHERE n.old_request_id IS NOT NULL
                    AND n.request_id IS NULL
                    AND EXISTS (SELECT 1 FROM purchase_requests_purchaserequest pr WHERE pr.id = n.old_request_id)
                """)

        if 'old_po_id' in existing_columns and 'purchase_order_id' in existing_columns:
            if table_exists(cursor, 'purchase_orders_purchaseorder'):
                cursor.execute("""
                    UPDATE user_notifications_notification n
                    SET purchase_order_id = n.old_po_id
                    WHERE n.old_po_id IS NOT NULL
                    AND n.purchase_order_id IS NULL
                    AND EXISTS (SELECT 1 FROM purchase_orders_purchaseorder po WHERE po.id = n.old_po_id)
                """)

        if 'old_receipt_id' in existing_columns and 'receipt_id' in existing_columns:
            if table_exists(cursor, 'receipts_receipt'):
                cursor.execute("""
                    UPDATE user_notifications_notification n
                    SET receipt_id = n.old_receipt_id
                    WHERE n.old_receipt_id IS NOT NULL
                    AND n.receipt_id IS NULL
                    AND EXISTS (SELECT 1 FROM receipts_receipt r WHERE r.id = n.old_receipt_id)
                """)

        # Step 6: Remove old columns
        existing_columns = get_existing_columns(cursor)
        old_columns = ['old_request_id', 'old_po_id', 'old_receipt_id']

        for col in old_columns:
            if col in existing_columns:
                cursor.execute(
                    f'ALTER TABLE user_notifications_notification DROP COLUMN "{col}"'
                )


class Migration(migrations.Migration):

    dependencies = [
        ('purchase_orders', '0001_initial'),
        ('purchase_requests', '0004_remove_completed_status'),
        ('receipts', '0001_initial'),
        ('user_notifications', '0001_initial'),
    ]

    operations = [
        # Run the idempotent migration that handles the actual database changes
        migrations.RunPython(idempotent_migration, migrations.RunPython.noop),

        # These state-only operations tell Django what the final schema looks like
        # They use state_operations to update Django's migration state without touching the DB
        migrations.SeparateDatabaseAndState(
            state_operations=[
                # Remove the old IntegerField columns from Django's state
                migrations.RemoveField(
                    model_name='notification',
                    name='po_id',
                ),
                migrations.RemoveField(
                    model_name='notification',
                    name='receipt_id',
                ),
                migrations.RemoveField(
                    model_name='notification',
                    name='request_id',
                ),
                # Add the new ForeignKey fields to Django's state
                migrations.AddField(
                    model_name='notification',
                    name='purchase_order',
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='notifications',
                        to='purchase_orders.purchaseorder'
                    ),
                ),
                migrations.AddField(
                    model_name='notification',
                    name='receipt',
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='notifications',
                        to='receipts.receipt'
                    ),
                ),
                migrations.AddField(
                    model_name='notification',
                    name='request',
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='notifications',
                        to='purchase_requests.purchaserequest'
                    ),
                ),
            ],
            database_operations=[],  # Database changes already handled by RunPython above
        ),
    ]
