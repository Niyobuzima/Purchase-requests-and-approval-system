import csv
import io
from datetime import datetime
from decimal import Decimal
from django.http import StreamingHttpResponse, HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from apps.purchase_orders.models import PurchaseOrder
from apps.receipts.models import Receipt


class Echo:
    """An object that implements just the write method of the file-like interface."""
    def write(self, value):
        """Write the value by returning it, instead of storing in a buffer."""
        return value


def generate_purchase_orders_csv(queryset, filters):
    """
    Generate CSV export for purchase orders with streaming
    """
    def generate_rows():
        # CSV Header
        writer = csv.writer(Echo())
        yield writer.writerow([
            'PO Number',
            'Request ID',
            'Request Title',
            'Requester',
            'Vendor',
            'Total Amount',
            'Status',
            'Generated Date',
            'Receipt Status',
            'Receipt Uploaded Date',
            'Validation Status',
        ])

        # Data rows
        for po in queryset:
            request = po.request
            receipt = po.receipts.first() if po.receipts.exists() else None

            yield writer.writerow([
                po.po_number,
                f"REQ-{request.id}",
                request.title,
                f"{request.requester.first_name} {request.requester.last_name}" if request.requester else "Unknown",
                request.vendor_name,
                float(request.total_amount),
                request.get_status_display(),
                po.generated_at.strftime('%Y-%m-%d %H:%M:%S'),
                receipt.validation_status if receipt else 'No Receipt',
                receipt.uploaded_at.strftime('%Y-%m-%d %H:%M:%S') if receipt else '',
                receipt.get_validation_status_display() if receipt else '',
            ])

    response = StreamingHttpResponse(generate_rows(), content_type='text/csv')
    filename = f"purchase_orders_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


def generate_receipts_csv(queryset, filters):
    """
    Generate CSV export for receipts
    """
    def generate_rows():
        writer = csv.writer(Echo())
        yield writer.writerow([
            'Receipt ID',
            'PO Number',
            'Request Title',
            'Vendor',
            'Uploaded By',
            'Upload Date',
            'Validation Status',
            'Total Amount',
            'Discrepancies Count',
            'Approved By',
            'Approved Date',
            'Finance Comments',
        ])

        for receipt in queryset:
            po = receipt.purchase_order
            request = po.request

            discrepancy_count = len(receipt.discrepancies) if isinstance(receipt.discrepancies, list) else 0

            yield writer.writerow([
                receipt.id,
                po.po_number,
                request.title,
                request.vendor_name,
                f"{receipt.uploaded_by.first_name} {receipt.uploaded_by.last_name}" if receipt.uploaded_by else "Unknown",
                receipt.uploaded_at.strftime('%Y-%m-%d %H:%M:%S'),
                receipt.get_validation_status_display(),
                float(receipt.purchase_order.request.total_amount),
                discrepancy_count,
                f"{receipt.approved_by.first_name} {receipt.approved_by.last_name}" if receipt.approved_by else '',
                receipt.approved_at.strftime('%Y-%m-%d %H:%M:%S') if receipt.approved_at else '',
                receipt.finance_comments or '',
            ])

    response = StreamingHttpResponse(generate_rows(), content_type='text/csv')
    filename = f"receipts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


def generate_spending_summary_pdf(data, filters):
    """
    Generate PDF summary report
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)

    # Container for flowables
    elements = []
    styles = getSampleStyleSheet()

    # Add custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30,
        alignment=TA_CENTER,
    )

    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=12,
        spaceBefore=12,
    )

    # Title
    elements.append(Paragraph("Procurement Summary Report", title_style))
    elements.append(Spacer(1, 12))

    # Report metadata
    metadata_data = [
        ['Generated Date:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
        ['Report Period:', f"{filters.get('start_date', 'All time')} to {filters.get('end_date', 'Present')}"],
        ['Total Records:', str(data.get('total_records', 0))],
    ]
    metadata_table = Table(metadata_data, colWidths=[2*inch, 4*inch])
    metadata_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2c3e50')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(metadata_table)
    elements.append(Spacer(1, 20))

    # Summary Statistics
    elements.append(Paragraph("Summary Statistics", heading_style))

    summary_data = [
        ['Metric', 'Value'],
        ['Total Purchase Orders', data.get('total_pos', 0)],
        ['Total Spending', f"${data.get('total_spending', 0):,.2f}"],
        ['Average PO Value', f"${data.get('avg_po_value', 0):,.2f}"],
        ['Approved Requests', data.get('approved_count', 0)],
        ['Pending Requests', data.get('pending_count', 0)],
        ['Rejected Requests', data.get('rejected_count', 0)],
        ['Receipts Validated', data.get('receipts_validated', 0)],
        ['Pending Validation', data.get('receipts_pending', 0)],
    ]

    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        # Data rows
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))

    # Top Vendors
    if data.get('top_vendors'):
        elements.append(Paragraph("Top 5 Vendors by Spending", heading_style))
        vendor_data = [['Vendor Name', 'Total Spent', 'PO Count']]
        for vendor in data['top_vendors'][:5]:
            vendor_data.append([
                vendor['vendor_name'],
                f"${vendor['total_spent']:,.2f}",
                vendor['po_count']
            ])

        vendor_table = Table(vendor_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
        vendor_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2ecc71')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(vendor_table)

    # Build PDF
    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()

    response = HttpResponse(content_type='application/pdf')
    filename = f"spending_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response.write(pdf)
    return response
