"""
Signal handlers for Purchase Order generation
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction, IntegrityError
from apps.approvals.models import Approval
from apps.purchase_requests.models import PurchaseRequest
from apps.purchase_orders.models import PurchaseOrder
from apps.purchase_orders.pdf_generator import generate_po_pdf
from apps.purchase_orders.cloudinary_utils import upload_po_pdf_to_cloudinary
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Approval)
def generate_purchase_order_on_final_approval(sender, instance, created, **kwargs):
    """
    Automatically generate Purchase Order when L2 approval is approved
    """
    # Only trigger on existing approvals (not newly created)
    if created:
        return

    # Check if this is a Level 2 approval that was just approved
    if instance.level == Approval.Level.LEVEL_2 and instance.status == Approval.Status.APPROVED:
        request = instance.request

        # Verify that the request status is APPROVED
        if request.status != PurchaseRequest.Status.APPROVED:
            logger.warning(f"L2 approval marked approved but request {request.id} status is {request.status}")
            return

        # Create or get existing Purchase Order atomically to prevent race conditions
        po = None
        created = False
        try:
            with transaction.atomic():
                # Use get_or_create to handle concurrent PO creation attempts
                po, created = PurchaseOrder.objects.get_or_create(
                    request=request,
                    defaults={}
                )
                
                if created:
                    logger.info(f"Created PO {po.po_number} for request {request.id}")
                else:
                    logger.info(f"PO already exists for request {request.id}: {po.po_number}")
                    return  # PO already exists, no need to generate PDF again
                    
        except IntegrityError as e:
            # Rare case: concurrent transaction created the PO between our check and create
            logger.warning(f"Concurrent PO creation detected for request {request.id}: {e}")
            try:
                po = PurchaseOrder.objects.get(request=request)
                logger.info(f"Retrieved existing PO {po.po_number} for request {request.id}")
                return  # Use existing PO, don't regenerate PDF
            except PurchaseOrder.DoesNotExist:
                logger.error(f"PO creation failed and retrieval failed for request {request.id}")
                return
        except Exception as e:
            logger.error(f"Error creating PO for request {request.id}: {e}", exc_info=True)
            return

        # Generate and upload PDF (optional - PO exists even if this fails)
        try:
            # Generate PDF
            pdf_buffer = generate_po_pdf(po)
            logger.info(f"Generated PDF for PO {po.po_number}")

            # Upload to Cloudinary
            pdf_url = upload_po_pdf_to_cloudinary(pdf_buffer, po.po_number)
            logger.info(f"Uploaded PDF to Cloudinary: {pdf_url}")

            # Update PO with PDF URL
            po.pdf_file = pdf_url
            po.save()

            logger.info(f"Successfully generated PO {po.po_number} with PDF for request {request.id}")

        except Exception as e:
            logger.error(f"Error generating PDF for PO {po.po_number}: {e}", exc_info=True)
            logger.warning(f"PO {po.po_number} created but PDF generation failed. PDF can be regenerated later.")
            # PO still exists, just without PDF - this is acceptable
