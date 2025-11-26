from django.db import migrations


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


def check_and_rename_columns(apps, schema_editor):
    """
    Check if old integer columns exist and rename them.
    This handles the case where the migration partially ran before.
    """
    connection = schema_editor.connection

    with connection.cursor() as cursor:
        existing_columns = get_existing_columns(cursor)

        # Rename columns if they exist (and not already renamed)
        renames = [
            ('request_id', 'old_request_id'),
            ('po_id', 'old_po_id'),
            ('receipt_id', 'old_receipt_id'),
        ]

        for old_name, new_name in renames:
            if old_name in existing_columns and new_name not in existing_columns:
                cursor.execute(
                    f'ALTER TABLE user_notifications_notification RENAME COLUMN "{old_name}" TO "{new_name}"'
                )


def add_fk_columns(apps, schema_editor):
    """Add ForeignKey columns if they don't already exist - without FK constraints initially"""
    connection = schema_editor.connection

    with connection.cursor() as cursor:
        existing_columns = get_existing_columns(cursor)

        # Add purchase_order_id column (without FK constraint first)
        if 'purchase_order_id' not in existing_columns:
            cursor.execute("""
                ALTER TABLE user_notifications_notification
                ADD COLUMN purchase_order_id BIGINT NULL
            """)

        # Add receipt_id column (without FK constraint first)
        if 'receipt_id' not in existing_columns:
            cursor.execute("""
                ALTER TABLE user_notifications_notification
                ADD COLUMN receipt_id BIGINT NULL
            """)

        # Add request_id column (without FK constraint first)
        if 'request_id' not in existing_columns:
            cursor.execute("""
                ALTER TABLE user_notifications_notification
                ADD COLUMN request_id BIGINT NULL
            """)


def add_fk_constraints(apps, schema_editor):
    """Add foreign key constraints after columns exist"""
    connection = schema_editor.connection

    with connection.cursor() as cursor:
        # Check which tables exist
        po_table_exists = table_exists(cursor, 'purchase_orders_purchaseorder')
        receipt_table_exists = table_exists(cursor, 'receipts_receipt')
        request_table_exists = table_exists(cursor, 'purchase_requests_purchaserequest')

        # Get existing constraints
        cursor.execute("""
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'user_notifications_notification'
            AND constraint_type = 'FOREIGN KEY'
        """)
        existing_constraints = {row[0] for row in cursor.fetchall()}

        # Add FK constraint for purchase_order_id if table exists and constraint doesn't
        if po_table_exists:
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
                    pass  # Constraint might already exist with different name

        # Add FK constraint for receipt_id if table exists
        if receipt_table_exists:
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

        # Add FK constraint for request_id if table exists
        if request_table_exists:
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


def migrate_data(apps, schema_editor):
    """Migrate data from old integer columns to new FK columns using raw SQL"""
    connection = schema_editor.connection

    with connection.cursor() as cursor:
        existing_columns = get_existing_columns(cursor)

        # Migrate old_request_id to request_id if both columns exist
        if 'old_request_id' in existing_columns and 'request_id' in existing_columns:
            if table_exists(cursor, 'purchase_requests_purchaserequest'):
                cursor.execute("""
                    UPDATE user_notifications_notification n
                    SET request_id = n.old_request_id
                    WHERE n.old_request_id IS NOT NULL
                    AND EXISTS (SELECT 1 FROM purchase_requests_purchaserequest pr WHERE pr.id = n.old_request_id)
                """)

        # Migrate old_po_id to purchase_order_id if both columns exist
        if 'old_po_id' in existing_columns and 'purchase_order_id' in existing_columns:
            if table_exists(cursor, 'purchase_orders_purchaseorder'):
                cursor.execute("""
                    UPDATE user_notifications_notification n
                    SET purchase_order_id = n.old_po_id
                    WHERE n.old_po_id IS NOT NULL
                    AND EXISTS (SELECT 1 FROM purchase_orders_purchaseorder po WHERE po.id = n.old_po_id)
                """)

        # Migrate old_receipt_id to receipt_id if both columns exist
        if 'old_receipt_id' in existing_columns and 'receipt_id' in existing_columns:
            if table_exists(cursor, 'receipts_receipt'):
                cursor.execute("""
                    UPDATE user_notifications_notification n
                    SET receipt_id = n.old_receipt_id
                    WHERE n.old_receipt_id IS NOT NULL
                    AND EXISTS (SELECT 1 FROM receipts_receipt r WHERE r.id = n.old_receipt_id)
                """)


def remove_old_columns(apps, schema_editor):
    """Remove old integer columns if they exist"""
    connection = schema_editor.connection

    with connection.cursor() as cursor:
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
        # Step 1: Rename old integer columns to avoid conflicts with new FK columns
        migrations.RunPython(check_and_rename_columns, migrations.RunPython.noop),
        # Step 2: Add new columns (without FK constraints initially)
        migrations.RunPython(add_fk_columns, migrations.RunPython.noop),
        # Step 3: Add FK constraints (checks if referenced tables exist)
        migrations.RunPython(add_fk_constraints, migrations.RunPython.noop),
        # Step 4: Migrate data from old columns to new FK columns
        migrations.RunPython(migrate_data, migrations.RunPython.noop),
        # Step 5: Remove old columns
        migrations.RunPython(remove_old_columns, migrations.RunPython.noop),
    ]
