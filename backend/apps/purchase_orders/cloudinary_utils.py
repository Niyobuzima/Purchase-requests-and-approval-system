"""
Cloudinary utilities for uploading Purchase Order PDFs
"""
import cloudinary.uploader
from django.core.files.uploadedfile import InMemoryUploadedFile


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
        print(f"Error uploading PDF to Cloudinary: {e}")
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
        # Extract public_id from URL
        # URL format: https://res.cloudinary.com/{cloud_name}/raw/upload/v{version}/{public_id}.pdf
        public_id = pdf_url.split('/upload/')[-1].replace('.pdf', '')

        # Delete from Cloudinary
        result = cloudinary.uploader.destroy(
            public_id,
            resource_type='raw',
            invalidate=True,
        )

        return result.get('result') == 'ok'

    except Exception as e:
        print(f"Error deleting PDF from Cloudinary: {e}")
        return False
