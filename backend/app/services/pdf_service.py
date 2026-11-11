import io
from decimal import Decimal
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_invoice_pdf(invoice, business, client) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    primary_color = colors.HexColor("#6375ff")
    dark_text = colors.HexColor("#182338")
    muted_text = colors.HexColor("#64748b")
    border_color = colors.HexColor("#e2e8f0")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=primary_color,
        spaceAfter=4,
    )

    bold_style = ParagraphStyle(
        'BoldStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=dark_text,
    )

    normal_style = ParagraphStyle(
        'NormalStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=dark_text,
        leading=13,
    )

    muted_style = ParagraphStyle(
        'MutedStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        textColor=muted_text,
        leading=11,
    )

    elements = []

    # Header: Business vs Invoice Number
    b_name = business.business_name if business else "PayPilot Merchant"
    b_owner = business.owner_name if business else ""
    b_email = business.email if business else ""
    b_address = business.address if business and business.address else ""

    header_left = [
        Paragraph(b_name, title_style),
        Paragraph(f"<b>{b_owner}</b>", normal_style),
        Paragraph(b_email, muted_style),
        Paragraph(b_address, muted_style),
    ]

    header_right = [
        Paragraph(f"<b>INVOICE:</b> {invoice.invoice_number}", ParagraphStyle('InvNum', parent=bold_style, fontSize=14, alignment=2)),
        Spacer(1, 4),
        Paragraph(f"<b>Issue Date:</b> {invoice.issue_date}", ParagraphStyle('InvDate', parent=normal_style, alignment=2)),
        Paragraph(f"<b>Due Date:</b> <font color='#e35d67'><b>{invoice.due_date}</b></font>", ParagraphStyle('InvDue', parent=normal_style, alignment=2)),
        Paragraph(f"<b>Status:</b> {invoice.status}", ParagraphStyle('InvStatus', parent=normal_style, alignment=2)),
    ]

    header_table = Table([[header_left, header_right]], colWidths=[300, 240])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(width="100%", thickness=1, color=border_color, spaceBefore=0, spaceAfter=15))

    # Billed To
    c_name = client.name if client else "Valued Client"
    c_company = client.company if client and client.company else ""
    c_email = client.email if client else ""
    c_addr = client.billing_address if client and client.billing_address else ""

    bill_to_data = [
        [
            Paragraph("<b>BILLED TO:</b>", ParagraphStyle('BilledTo', parent=muted_style, fontSize=8)),
            Paragraph("<b>PAYMENT SUMMARY:</b>", ParagraphStyle('PaySum', parent=muted_style, fontSize=8)),
        ],
        [
            [
                Paragraph(f"<b>{c_name}</b>", bold_style),
                Paragraph(c_company, normal_style) if c_company else Spacer(1, 0),
                Paragraph(c_email, muted_style),
                Paragraph(c_addr, muted_style) if c_addr else Spacer(1, 0),
            ],
            [
                Paragraph(f"<b>Currency:</b> {invoice.currency}", normal_style),
                Paragraph(f"<b>Total Due:</b> <font color='#16a36d'><b>{invoice.currency} {float(invoice.total_amount):,.2f}</b></font>", ParagraphStyle('TotDue', parent=bold_style, fontSize=12)),
            ]
        ]
    ]

    bill_table = Table(bill_to_data, colWidths=[340, 200])
    bill_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
    ]))
    elements.append(bill_table)
    elements.append(Spacer(1, 20))

    # Items Table
    item_rows = [
        [
            Paragraph("<b>Item Description</b>", bold_style),
            Paragraph("<b>Qty</b>", ParagraphStyle('HQty', parent=bold_style, alignment=2)),
            Paragraph("<b>Unit Price</b>", ParagraphStyle('HPrice', parent=bold_style, alignment=2)),
            Paragraph("<b>Total</b>", ParagraphStyle('HTotal', parent=bold_style, alignment=2)),
        ]
    ]

    for item in invoice.items:
        item_rows.append([
            Paragraph(item.description, normal_style),
            Paragraph(f"{float(item.quantity):.2f}", ParagraphStyle('IQty', parent=normal_style, alignment=2)),
            Paragraph(f"{float(item.unit_price):,.2f}", ParagraphStyle('IPrice', parent=normal_style, alignment=2)),
            Paragraph(f"{float(item.total):,.2f}", ParagraphStyle('ITot', parent=bold_style, alignment=2)),
        ])

    items_table = Table(item_rows, colWidths=[280, 60, 100, 100])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, border_color),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, border_color),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 15))

    # Calculations Summary
    calc_rows = [
        [Paragraph("Subtotal:", normal_style), Paragraph(f"{invoice.currency} {float(invoice.subtotal):,.2f}", ParagraphStyle('Sub', parent=normal_style, alignment=2))],
    ]

    if float(invoice.tax_amount) > 0:
        calc_rows.append([Paragraph(f"Tax ({float(invoice.tax_rate):.1f}%):", normal_style), Paragraph(f"{invoice.currency} {float(invoice.tax_amount):,.2f}", ParagraphStyle('Tax', parent=normal_style, alignment=2))])

    if float(invoice.discount_amount) > 0:
        calc_rows.append([Paragraph("Discount:", normal_style), Paragraph(f"-{invoice.currency} {float(invoice.discount_amount):,.2f}", ParagraphStyle('Disc', parent=normal_style, alignment=2))])

    calc_rows.append([
        Paragraph("<b>Total Due:</b>", ParagraphStyle('BTot', parent=bold_style, fontSize=11)),
        Paragraph(f"<b>{invoice.currency} {float(invoice.total_amount):,.2f}</b>", ParagraphStyle('BTotVal', parent=bold_style, fontSize=11, alignment=2, textColor=colors.HexColor("#16a36d"))),
    ])

    summary_table = Table(calc_rows, colWidths=[140, 100])
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, -2), (-1, -2), 1, border_color),
    ]))

    calc_wrapper = Table([[Spacer(1, 1), summary_table]], colWidths=[300, 240])
    calc_wrapper.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(calc_wrapper)
    elements.append(Spacer(1, 20))

    # Terms & Notes
    terms_text = invoice.terms or "Payment due on specified date."
    notes_text = invoice.notes or "Thank you for your business!"

    terms_notes = [
        Paragraph("<b>Payment Terms:</b>", bold_style),
        Paragraph(terms_text, muted_style),
        Spacer(1, 6),
        Paragraph("<b>Notes:</b>", bold_style),
        Paragraph(notes_text, muted_style),
    ]

    elements.extend(terms_notes)

    doc.build(elements)
    buffer.seek(0)
    return buffer

