"""
Cloudinary utilities for uploading Purchase Order PDFs
"""
import cloudinary.uploader
from django.core.files.uploadedfile import InMemoryUploadedFile
import logging

logger = logging.getLogger(__name__)


def upload_po_pdf_to_cloudinary(pdf_buffer, po_number):
    """
    Upload PO PDF to Cloudinary

    Args:
        pdf_buffer: BytesIO object containing the PDF
        po_number: String PO number for naming the file

    Returns:
        str: Cloudinary secure URL of the uploaded PDF
    """
    try:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            pdf_buffer,
            folder='purchase_orders',
            resource_type='raw',  # For non-image files
            public_id=f'PO_{po_number}',
            format='pdf',
            overwrite=True,
            invalidate=True,
        )

        # Return the secure URL
        return result.get('secure_url')

    except Exception as e:
        logger.error(f"Error uploading PDF to Cloudinary: {e}", exc_info=True)
        raise


def delete_po_pdf_from_cloudinary(pdf_url):
    """
    Delete PO PDF from Cloudinary

    Args:
        pdf_url: Cloudinary URL of the PDF to delete

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Extract public_id from URL more robustly
        if '/upload/' not in pdf_url:
            logger.error(f"Invalid Cloudinary URL format: {pdf_url}")
            return False
        
        public_id = pdf_url.split('/upload/')[-1].replace('.pdf', '')
        if not public_id:
            logger.error(f"Could not extract public_id from URL: {pdf_url}")
            return False

        # Delete from Cloudinary
        result = cloudinary.uploader.destroy(
            public_id,
            resource_type='raw',
            invalidate=True,
        )

        return result.get('result') == 'ok'

    except Exception as e:
        logger.error(f"Error deleting PDF from Cloudinary: {e}", exc_info=True)
        return False
