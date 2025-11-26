"""
Management command to clean up orphaned temporary files.

This command scans the system's temporary directory for orphaned files
created by the document upload process and removes those that exceed
the retention threshold.

SAFETY FEATURES:
- Only targets files with 'pr_upload_' prefix (application-specific)
- Checks cache to identify and preserve active upload files
- Skips files within retention period
- Supports Redis pattern scanning and database fallback methods

Usage:
    python manage.py cleanup_temp_files [--retention-hours HOURS] [--dry-run]

Options:
    --retention-hours: Hours after which temp files are considered orphaned (default: 24)
    --dry-run: Show what would be deleted without actually deleting

Cache Backend Support:
    - Redis: Uses SCAN command for efficient pattern matching
    - Other backends: Falls back to checking recent PurchaseRequest records
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
        
        # Scan cache for active temp files
        # Try to get all active upload cache keys
        try:
            # Check if Redis backend is available for pattern scanning
            if hasattr(cache, 'client'):
                # Redis backend - use SCAN for efficiency
                try:
                    redis_client = cache.client.get_client()
                    for key in redis_client.scan_iter(match='upload_file_*'):
                        key_str = key.decode() if isinstance(key, bytes) else key
                        cache_data = cache.get(key_str)
                        if cache_data and isinstance(cache_data, dict) and 'temp_path' in cache_data:
                            active_temp_files.add(cache_data['temp_path'])
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Found {len(active_temp_files)} active temp files in cache (Redis)'
                        )
                    )
                except Exception as redis_error:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Could not scan Redis cache: {redis_error}'
                        )
                    )
                    app_logger.warning(
                        f"Could not scan Redis cache for active files: {redis_error}"
                    )
            else:
                # Non-Redis backend - use PurchaseRequest model as fallback
                # Get recent requests (within cache timeout window) that might have active uploads
                from apps.purchase_requests.models import PurchaseRequest
                from django.utils import timezone
                from datetime import timedelta
                from core.constants import TEMP_FILE_CACHE_TIMEOUT
                
                cache_window = timezone.now() - timedelta(seconds=TEMP_FILE_CACHE_TIMEOUT * 2)
                recent_requests = PurchaseRequest.objects.filter(
                    updated_at__gte=cache_window
                ).values_list('id', flat=True)
                
                # Check cache for each recent request
                for request_id in recent_requests:
                    cache_key = f'upload_file_{request_id}'
                    cache_data = cache.get(cache_key)
                    if cache_data and isinstance(cache_data, dict) and 'temp_path' in cache_data:
                        active_temp_files.add(cache_data['temp_path'])
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Found {len(active_temp_files)} active temp files in cache (DB fallback)'
                    )
                )
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(
                    f'Could not load active temp files from cache: {e}'
                )
            )
            app_logger.warning(
                f"Could not load active temp files from cache: {e}",
                exc_info=True
            )
        
        deleted_count = 0
        skipped_count = 0
        skipped_active_count = 0
        error_count = 0
        total_size = 0

        # Allowed extensions from file upload validation
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif']

        try:
            # Scan temp directory for files matching our specific pattern
            # Only match files created by our upload process (pr_upload_* prefix)
            temp_path = Path(temp_dir)
            
            for ext in allowed_extensions:
                for file_path in temp_path.glob(f'pr_upload_*{ext}'):
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
                        
                        # CRITICAL: Check if file is still active (in cache)
                        if str(file_path) in active_temp_files:
                            skipped_active_count += 1
                            self.stdout.write(
                                self.style.WARNING(
                                    f'Skipping active file: {file_path} (in cache)'
                                )
                            )
                            continue
                        
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
            self.stdout.write(f'  Files skipped (active in cache): {skipped_active_count}')
            self.stdout.write(f'  Errors: {error_count}')
            self.stdout.write(f'  Total space freed: {total_size / 1024 / 1024:.2f} MB')
            
            app_logger.info(
                "Temp file cleanup completed",
                deleted_count=deleted_count,
                skipped_count=skipped_count,
                skipped_active_count=skipped_active_count,
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
