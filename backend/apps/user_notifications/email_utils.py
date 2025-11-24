"""
Email utility functions for sending notification emails
"""
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def send_notification_email(user, subject, message, action_url=None):
    """
    Send a notification email to a user

    Args:
        user: User object to send email to
        subject: Email subject line
        message: Email message body
        action_url: Optional URL for action button
    """
    try:
        # Create HTML email content
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #2563eb;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{
                    background-color: #f9fafb;
                    padding: 30px;
                    border: 1px solid #e5e7eb;
                }}
                .message {{
                    background-color: white;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #2563eb;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    color: #6b7280;
                    font-size: 12px;
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>ProcureFlow Notification</h2>
                </div>
                <div class="content">
                    <p>Hello {user.get_full_name() or user.username},</p>
                    <div class="message">
                        <p>{message}</p>
                    </div>
                    {f'<a href="{action_url}" class="button">View Details</a>' if action_url else ''}
                    <p>Best regards,<br>ProcureFlow Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated notification from ProcureFlow.</p>
                    <p>Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Plain text version
        plain_message = f"""
Hello {user.get_full_name() or user.username},

{message}

{'View Details: ' + action_url if action_url else ''}

Best regards,
ProcureFlow Team

---
This is an automated notification from ProcureFlow.
Please do not reply to this email.
        """

        # Send email
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=True,  # Don't raise exceptions if email fails
        )

        return True
    except Exception as e:
        # Log the error but don't break the application
        print(f"Failed to send email to {user.email}: {str(e)}")
        return False


def send_approval_email(user, request_id, level, approver_name):
    """Send email notification for request approval"""
    subject = f"Request PR-{request_id} Approved - Level {level}"
    message = f"""
Your purchase request PR-{request_id} has been approved by {approver_name}.

{f'The request is now pending Level 2 approval.' if level == 1 else 'Your request has been fully approved and a Purchase Order will be generated shortly.'}

You can view the request details by clicking the button below.
    """
    action_url = f"{settings.FRONTEND_URL}/staff/requests/{request_id}"

    return send_notification_email(user, subject, message, action_url)


def send_rejection_email(user, request_id, level, approver_name, reason):
    """Send email notification for request rejection"""
    subject = f"Request PR-{request_id} Rejected at Level {level}"
    message = f"""
Your purchase request PR-{request_id} has been rejected by {approver_name}.

Rejection Reason: {reason}

Please review the feedback and consider revising your request if appropriate.

You can view the request details by clicking the button below.
    """
    action_url = f"{settings.FRONTEND_URL}/staff/requests/{request_id}"

    return send_notification_email(user, subject, message, action_url)


def send_po_generated_email(user, request_id, po_number, role='STAFF'):
    """Send email notification for purchase order generation"""
    subject = f"Purchase Order {po_number} Generated"

    if role == 'STAFF':
        message = f"""
Great news! A Purchase Order has been generated for your request PR-{request_id}.

Purchase Order Number: {po_number}

You can view the purchase order details by clicking the button below.
        """
        action_url = f"{settings.FRONTEND_URL}/staff/purchase-orders"
    else:  # FINANCE
        message = f"""
A new Purchase Order has been generated.

Purchase Order Number: {po_number}
Request ID: PR-{request_id}

You can view the purchase order details by clicking the button below.
        """
        action_url = f"{settings.FRONTEND_URL}/finance/purchase-orders"

    return send_notification_email(user, subject, message, action_url)


def send_receipt_uploaded_email(user, po_number, uploader_name):
    """Send email notification for receipt upload"""
    subject = f"New Receipt Uploaded for PO {po_number}"
    message = f"""
A receipt has been uploaded for Purchase Order {po_number} by {uploader_name}.

The receipt is now pending validation.

You can view and validate the receipt by clicking the button below.
    """
    action_url = f"{settings.FRONTEND_URL}/finance/receipts"

    return send_notification_email(user, subject, message, action_url)
