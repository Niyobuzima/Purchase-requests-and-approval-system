from django.core.management.base import BaseCommand
from apps.users.models import User


class Command(BaseCommand):
    help = 'Seed test users for development and testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            type=str,
            default='Test@123',
            help='Password for all seeded users (default: Test@123)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing test users before seeding'
        )

    def handle(self, *args, **options):
        password = options['password']
        clear = options['clear']

        # Test users to seed
        test_users = [
            {
                'username': 'admin',
                'email': 'admin@test.com',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': User.Role.ADMIN,
                'department': 'Administration',
            },
            {
                'username': 'approver1',
                'email': 'approver1@test.com',
                'first_name': 'Approver',
                'last_name': 'Level One',
                'role': User.Role.APPROVER_L1,
                'department': 'Management',
            },
            {
                'username': 'approver2',
                'email': 'approver2@test.com',
                'first_name': 'Approver',
                'last_name': 'Level Two',
                'role': User.Role.APPROVER_L2,
                'department': 'Executive',
            },
            {
                'username': 'finance',
                'email': 'finance@test.com',
                'first_name': 'Finance',
                'last_name': 'User',
                'role': User.Role.FINANCE,
                'department': 'Finance',
            },
            {
                'username': 'staff',
                'email': 'staff@test.com',
                'first_name': 'Staff',
                'last_name': 'User',
                'role': User.Role.STAFF,
                'department': 'Operations',
            },
        ]

        if clear:
            # Delete existing test users
            emails = [u['email'] for u in test_users]
            deleted_count, _ = User.objects.filter(email__in=emails).delete()
            self.stdout.write(
                self.style.WARNING(f'Deleted {deleted_count} existing test user(s)')
            )

        created_count = 0
        updated_count = 0

        for user_data in test_users:
            user, created = User.objects.update_or_create(
                username=user_data['username'],
                defaults={
                    'email': user_data['email'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'role': user_data['role'],
                    'department': user_data['department'],
                    'is_active': True,
                }
            )

            if created:
                user.set_password(password)
                user.save()
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created: {user.email} ({user.get_role_display()})'
                    )
                )
            else:
                # Update existing user
                user.username = user_data['username']
                user.first_name = user_data['first_name']
                user.last_name = user_data['last_name']
                user.role = user_data['role']
                user.department = user_data['department']
                user.is_active = True
                user.set_password(password)
                user.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'Updated: {user.email} ({user.get_role_display()})'
                    )
                )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Seeding complete!'))
        self.stdout.write(f'  Created: {created_count}')
        self.stdout.write(f'  Updated: {updated_count}')
        self.stdout.write('')
        self.stdout.write(self.style.NOTICE('Test Users:'))
        self.stdout.write('-' * 50)
        for user_data in test_users:
            self.stdout.write(
                f"  {user_data['email']:25} | {user_data['role']:12} | Password: {password}"
            )
        self.stdout.write('-' * 50)
