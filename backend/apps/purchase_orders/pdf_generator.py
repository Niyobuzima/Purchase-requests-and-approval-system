"""
PDF generation utility for Purchase Orders using ReportLab
Professional template with company header, approval signatures, and enhanced styling
"""
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfgen import canvas
import logging

logger = logging.getLogger(__name__)


def safe_float(value, field_name="value", fallback=0.0):
    """
    Safely convert a value to float with fallback for None or invalid values.
    
    Args:
        value: Value to convert to float
        field_name: Name of the field (for logging)
        fallback: Fallback value if conversion fails (default: 0.0)
    
    Returns:
        float: Converted value or fallback
    """
    if value is None:
        logger.warning(f"Field '{field_name}' is None, using fallback {fallback}")
        return fallback
    
    try:
        return float(value)
    except (ValueError, TypeError) as e:
        logger.warning(f"Failed to convert '{field_name}' value '{value}' to float: {e}. Using fallback {fallback}")
        return fallback


def add_footer(canvas_obj, doc):
    """
    Add footer with terms and conditions to each page.

    Args:
        canvas_obj: ReportLab canvas object
        doc: Document template object
    """
    canvas_obj.saveState()

    # Terms and conditions text (compact)
    terms_text = (
        "Terms: Payment due within 30 days (1.5% monthly interest on late payments). "
        "Items must meet specifications; non-compliant items returned at vendor's expense. "
        "Defective items returnable within 14 days. Vendor warrants items are defect-free. "
        "Timely delivery required; notify immediately of delays. Vendor must comply with all applicable laws. "
        "Changes require written approval from both parties. This PO is system-generated and electronically approved."
    )

    # Set font for terms
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.setFillColor(colors.HexColor('#6b7280'))

    # Calculate text wrapping for terms (multi-line if needed)
    from reportlab.pdfbase.pdfmetrics import stringWidth
    page_width = letter[0]
    text_width = page_width - 120  # Account for margins (60 on each side)

    # Simple word wrapping
    words = terms_text.split()
    lines = []
    current_line = []

    for word in words:
        test_line = ' '.join(current_line + [word])
        if stringWidth(test_line, 'Helvetica', 7) <= text_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]

    if current_line:
        lines.append(' '.join(current_line))

    # Draw terms lines from bottom up
    y_position = 50  # 50 points from bottom
    for i, line in enumerate(reversed(lines)):
        canvas_obj.drawString(60, y_position + (i * 10), line)

    canvas_obj.restoreState()


def generate_po_pdf(purchase_order):
    """
    Generate professional PDF for a Purchase Order with company header,
    approval signatures, and enhanced styling.

    Args:
        purchase_order: PurchaseOrder model instance

    Returns:
        BytesIO: PDF file as bytes
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                           rightMargin=60, leftMargin=60,
                           topMargin=50, bottomMargin=80)  # Increased bottom margin for footer

    # Container for the 'Flowable' objects
    elements = []

    # Define styles
    styles = getSampleStyleSheet()

    # Company header style
    company_style = ParagraphStyle(
        'CompanyHeader',
        parent=styles['Normal'],
        fontSize=18,
        textColor=colors.HexColor('#1e3a8a'),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        spaceAfter=4,
    )

    company_info_style = ParagraphStyle(
        'CompanyInfo',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER,
        spaceAfter=20,
    )

    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=22,
        textColor=colors.white,
        spaceAfter=0,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
    )

    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=colors.HexColor('#1e3a8a'),
        spaceAfter=10,
        fontName='Helvetica-Bold',
    )

    label_style = ParagraphStyle(
        'LabelStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#6b7280'),
        fontName='Helvetica',
    )

    value_style = ParagraphStyle(
        'ValueStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#111827'),
        fontName='Helvetica',
    )

    # ========== COMPANY HEADER ==========
    company_name = Paragraph("<b>PROCURE-TO-PAY SYSTEM</b>", company_style)
    elements.append(company_name)

    company_details = Paragraph(
        "Purchase Order Management | procurement@company.com | +1 (555) 123-4567",
        company_info_style
    )
    elements.append(company_details)

    # Horizontal line separator
    elements.append(Spacer(1, 3))
    line_data = [['', '']]
    line_table = Table(line_data, colWidths=[7*inch])
    line_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 2, colors.HexColor('#1e3a8a')),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 10))

    # ========== TITLE BOX ==========
    title_data = [[Paragraph("<b>PURCHASE ORDER</b>", title_style)]]
    title_table = Table(title_data, colWidths=[7*inch])
    title_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e3a8a')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(title_table)
    elements.append(Spacer(1, 12))

    # ========== PO INFORMATION AND VENDOR SECTION ==========
    # Create two-column layout for PO info and Vendor info
    po_left_data = [
        ['PO Number:', purchase_order.po_number],
        ['Issue Date:', purchase_order.generated_at.strftime('%B %d, %Y')],
        ['Status:', 'Approved'],
    ]

    vendor_name = purchase_order.request.vendor_name or 'N/A'
    vendor_right_data = [
        ['Vendor:', vendor_name],
        ['Request ID:', f"#{purchase_order.request.id}"],
        ['Requester:', f"{purchase_order.request.requester.first_name} {purchase_order.request.requester.last_name}"],
    ]

    # Left table (PO Info)
    po_left_table = Table(po_left_data, colWidths=[1.2*inch, 2*inch])
    po_left_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#111827')),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))

    # Right table (Vendor Info)
    vendor_right_table = Table(vendor_right_data, colWidths=[1.2*inch, 2*inch])
    vendor_right_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#111827')),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))

    # Combine into single row
    combined_info_data = [[po_left_table, vendor_right_table]]
    combined_info_table = Table(combined_info_data, colWidths=[3.5*inch, 3.5*inch])
    combined_info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))

    elements.append(combined_info_table)
    elements.append(Spacer(1, 12))

    # ========== ITEMS SECTION ==========
    items_heading = Paragraph("<b>Order Items</b>", heading_style)
    elements.append(items_heading)
    elements.append(Spacer(1, 6))

    # Items Table Header
    items_data = [
        ['#', 'Description', 'Qty', 'Unit Price', 'Amount']
    ]

    # Items Table Data
    for index, item in enumerate(purchase_order.request.items.all(), start=1):
        unit_price = safe_float(item.unit_price, f"item[{index}].unit_price")
        subtotal = safe_float(item.subtotal, f"item[{index}].subtotal")
        quantity = safe_float(item.quantity, f"item[{index}].quantity")

        # Format quantity without decimals if it's a whole number
        qty_str = f"{int(quantity)}" if quantity == int(quantity) else f"{quantity:.2f}"

        items_data.append([
            str(index),
            item.description,
            qty_str,
            f"${unit_price:.2f}",
            f"${subtotal:.2f}"
        ])

    # Calculate totals
    total_amount = safe_float(purchase_order.request.total_amount, "total_amount")

    # Add subtotal and total rows
    items_data.append(['', '', '', Paragraph('<b>Subtotal:</b>', value_style), f"${total_amount:.2f}"])
    items_data.append(['', '', '', Paragraph('<b>Tax (0%):</b>', value_style), '$0.00'])
    items_data.append(['', '', '', Paragraph('<b>TOTAL:</b>', value_style), f"${total_amount:.2f}"])

    # Create items table with adjusted column widths
    items_table = Table(items_data, colWidths=[0.4*inch, 3.2*inch, 0.8*inch, 1.5*inch, 1.1*inch])

    items_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('ALIGN', (1, 0), (1, 0), 'LEFT'),
        ('ALIGN', (2, 0), (-1, 0), 'RIGHT'),

        # Data rows
        ('FONTNAME', (0, 1), (-1, -4), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -4), 9),
        ('ALIGN', (0, 1), (0, -4), 'CENTER'),  # Index column
        ('ALIGN', (1, 1), (1, -4), 'LEFT'),    # Description column
        ('ALIGN', (2, 1), (-1, -4), 'RIGHT'),  # Numbers columns

        # Subtotal, Tax, Total rows
        ('FONTNAME', (0, -3), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -3), (-1, -1), 10),
        ('ALIGN', (0, -3), (-1, -1), 'RIGHT'),
        ('LINEABOVE', (3, -3), (-1, -3), 1, colors.HexColor('#6b7280')),
        ('LINEABOVE', (3, -1), (-1, -1), 2, colors.black),
        ('BACKGROUND', (3, -1), (-1, -1), colors.HexColor('#f3f4f6')),

        # All rows styling
        ('GRID', (0, 0), (-1, -4), 0.5, colors.HexColor('#d1d5db')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))

    elements.append(items_table)
    elements.append(Spacer(1, 12))

    # ========== APPROVAL SIGNATURES SECTION (COMPACT) ==========
    # Get approval records
    approvals = purchase_order.request.approvals.filter(status='APPROVED').order_by('level')

    # Build compact approval line
    approval_parts = []
    for approval in approvals:
        approver_name = f"{approval.approver.first_name} {approval.approver.last_name}" if approval.approver else "System"
        approval_date = approval.processed_at.strftime('%b %d, %Y') if approval.processed_at else 'N/A'
        approval_parts.append(f"<b>L{approval.level}:</b> {approver_name} (✓ {approval_date})")

    approvals_text = " | ".join(approval_parts)

    approval_style = ParagraphStyle(
        'ApprovalStyle',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#059669'),
        alignment=TA_LEFT,
        leading=10,
    )

    approvals_heading = Paragraph("<b>Approvals:</b> " + approvals_text, approval_style)
    elements.append(approvals_heading)

    # Build PDF with footer on every page
    doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)

    # Get the value of the BytesIO buffer and return it
    buffer.seek(0)
    return buffer
