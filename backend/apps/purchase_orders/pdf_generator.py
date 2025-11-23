"""
PDF generation utility for Purchase Orders using ReportLab
"""
from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT


def generate_po_pdf(purchase_order):
    """
    Generate PDF for a Purchase Order

    Args:
        purchase_order: PurchaseOrder model instance

    Returns:
        BytesIO: PDF file as bytes
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                           rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=18)

    # Container for the 'Flowable' objects
    elements = []

    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e3a8a'),
        spaceAfter=30,
        alignment=TA_CENTER,
    )

    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1e3a8a'),
        spaceAfter=12,
    )

    # Title
    title = Paragraph("<b>PURCHASE ORDER</b>", title_style)
    elements.append(title)
    elements.append(Spacer(1, 12))

    # PO Information
    po_info_data = [
        ['PO Number:', purchase_order.po_number],
        ['Generated Date:', purchase_order.generated_at.strftime('%B %d, %Y')],
        ['Request Title:', purchase_order.request.title],
        ['Requester:', f"{purchase_order.request.requester.first_name} {purchase_order.request.requester.last_name}"],
    ]

    po_info_table = Table(po_info_data, colWidths=[2*inch, 4*inch])
    po_info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))

    elements.append(po_info_table)
    elements.append(Spacer(1, 20))

    # Items Section
    items_heading = Paragraph("<b>Items</b>", heading_style)
    elements.append(items_heading)
    elements.append(Spacer(1, 12))

    # Items Table Header
    items_data = [
        ['#', 'Description', 'Quantity', 'Unit Price', 'Total']
    ]

    # Items Table Data
    for index, item in enumerate(purchase_order.request.items.all(), start=1):
        items_data.append([
            str(index),
            item.description,
            str(item.quantity),
            f"${float(item.unit_price):.2f}",
            f"${float(item.subtotal):.2f}"
        ])

    # Calculate totals
    subtotal = float(purchase_order.request.total_amount)

    # Add subtotal row
    items_data.append(['', '', '', 'Subtotal:', f"${subtotal:.2f}"])

    # Add total row
    items_data.append(['', '', '', 'Total:', f"${subtotal:.2f}"])

    # Create items table
    items_table = Table(items_data, colWidths=[0.5*inch, 3*inch, 1*inch, 1.25*inch, 1.25*inch])

    items_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),

        # Data rows
        ('FONTNAME', (0, 1), (-1, -3), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -3), 10),
        ('ALIGN', (0, 1), (0, -3), 'CENTER'),  # Index column
        ('ALIGN', (1, 1), (1, -3), 'LEFT'),    # Description column
        ('ALIGN', (2, 1), (-1, -3), 'RIGHT'),  # Numbers columns

        # Totals rows
        ('FONTNAME', (0, -2), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -2), (-1, -1), 11),
        ('ALIGN', (0, -2), (-1, -1), 'RIGHT'),
        ('LINEABOVE', (0, -2), (-1, -2), 1, colors.black),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.black),

        # All rows
        ('GRID', (0, 0), (-1, -3), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))

    elements.append(items_table)
    elements.append(Spacer(1, 30))

    # Footer / Terms
    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_LEFT,
    )

    footer_text = """
    <b>Terms and Conditions:</b><br/>
    1. Payment terms: Net 30 days from receipt of invoice<br/>
    2. Delivery: As specified in purchase request<br/>
    3. Quality: All items must meet specifications<br/>
    4. Returns: Defective items may be returned within 14 days<br/><br/>

    <b>Authorized by:</b> Purchase Approval System<br/>
    <b>Date:</b> {date}
    """.format(date=datetime.now().strftime('%B %d, %Y'))

    footer = Paragraph(footer_text, footer_style)
    elements.append(footer)

    # Build PDF
    doc.build(elements)

    # Get the value of the BytesIO buffer and return it
    buffer.seek(0)
    return buffer
