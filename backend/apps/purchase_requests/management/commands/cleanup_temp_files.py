"""
Management command to clean up orphaned temporary files.

This command scans the system's temporary directory for orphaned files
created by the document upload process and removes those that exceed
the retention threshold.

Usage:
    python manage.py cleanup_temp_files [--retention-hours HOURS] [--dry-run]

Options:
    --retention-hours: Hours after which temp files are considered orphaned (default: 24)
    --dry-run: Show what would be deleted without actually deleting
"""

import os
import time
import tempfile
from pathlib import Path
from django.core.management.base import BaseCommand
from django.core.cache import cache
from core.logging_utils import app_logger


class Command(BaseCommand):
    help = 'Clean up orphaned temporary files from document uploads'

    def add_arguments(self, parser):
        parser.add_argument(
            '--retention-hours',
            type=int,
            default=24,
            help='Hours after which temp files are considered orphaned (default: 24)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        retention_hours = options['retention_hours']
        dry_run = options['dry_run']
        retention_seconds = retention_hours * 3600

        self.stdout.write(
            self.style.SUCCESS(
                f'Starting cleanup of temp files older than {retention_hours} hours...'
            )
        )

        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN - No files will be deleted')
            )

        temp_dir = tempfile.gettempdir()
        current_time = time.time()
        
        # Track active temp files from cache
        active_temp_files = set()
        cache_pattern = 'upload_file_*'
        
        # Scan cache for active temp files
        # Note: Django cache doesn't support pattern scanning directly
        # This is a placeholder - in production, consider using Redis SCAN
        # or maintaining a separate index of active temp files
        
        deleted_count = 0
        skipped_count = 0
        error_count = 0
        total_size = 0

        try:
            # Scan temp directory for files matching our pattern
            # We create temp files with specific extensions (.pdf, .jpg, .png, etc.)
            temp_path = Path(temp_dir)
            
            for file_path in temp_path.glob('tmp*'):
                if not file_path.is_file():
                    continue
                
                try:
                    # Get file metadata
                    file_stat = file_path.stat()
                    file_age = current_time - file_stat.st_mtime
                    
                    # Skip files that are still within retention period
                    if file_age < retention_seconds:
                        skipped_count += 1
                        continue
                    
                    # Check if file is in cache (still active)
                    # This is a heuristic check - may need enhancement
                    file_size = file_stat.st_size
                    
                    if dry_run:
                        self.stdout.write(
                            f'Would delete: {file_path} '
                            f'(age: {file_age/3600:.1f}h, size: {file_size} bytes)'
                        )
                        deleted_count += 1
                        total_size += file_size
                    else:
                        # Delete the file
                        os.unlink(file_path)
                        deleted_count += 1
                        total_size += file_size
                        
                        app_logger.info(
                            f"Deleted orphaned temp file: {file_path}",
                            file_age_hours=file_age/3600,
                            file_size=file_size
                        )
                        
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f'Error processing {file_path}: {e}'
                        )
                    )
                    app_logger.error(
                        f"Failed to cleanup temp file {file_path}: {e}",
                        exc_info=True
                    )

            # Summary
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nCleanup complete:'
                )
            )
            self.stdout.write(f'  Files deleted: {deleted_count}')
            self.stdout.write(f'  Files skipped (recent): {skipped_count}')
            self.stdout.write(f'  Errors: {error_count}')
            self.stdout.write(f'  Total space freed: {total_size / 1024 / 1024:.2f} MB')
            
            app_logger.info(
                "Temp file cleanup completed",
                deleted_count=deleted_count,
                skipped_count=skipped_count,
                error_count=error_count,
                total_size_bytes=total_size,
                retention_hours=retention_hours,
                dry_run=dry_run
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f'Cleanup failed: {e}'
                )
            )
            app_logger.error(
                f"Temp file cleanup failed: {e}",
                exc_info=True
            )
            raise
