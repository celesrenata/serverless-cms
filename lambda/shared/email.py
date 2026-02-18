"""
Email utility module for sending emails via AWS SES.

This module provides functions for sending various types of emails
including welcome emails, password resets, notifications, etc.
"""

import os
import boto3
import logging
from typing import Dict, List, Optional
from botocore.exceptions import ClientError

# Use standard Python logger
logger = logging.getLogger(__name__)

# Initialize SES client
ses_client = boto3.client('ses', region_name=os.environ.get('SES_REGION', 'us-east-1'))

# Configuration from environment variables
FROM_EMAIL = os.environ.get('SES_FROM_EMAIL', 'no-reply@celestium.life')
CONFIGURATION_SET = os.environ.get('SES_CONFIGURATION_SET', '')


def send_email(
    to_addresses: List[str],
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    reply_to: Optional[List[str]] = None,
    cc_addresses: Optional[List[str]] = None,
    bcc_addresses: Optional[List[str]] = None,
) -> Dict:
    """
    Send an email via AWS SES.
    
    Args:
        to_addresses: List of recipient email addresses
        subject: Email subject line
        body_text: Plain text email body
        body_html: Optional HTML email body
        reply_to: Optional list of reply-to addresses
        cc_addresses: Optional list of CC addresses
        bcc_addresses: Optional list of BCC addresses
    
    Returns:
        Dict containing the SES response with MessageId
    
    Raises:
        ClientError: If SES API call fails
    """
    try:
        # Build the email message
        message = {
            'Subject': {
                'Data': subject,
                'Charset': 'UTF-8'
            },
            'Body': {
                'Text': {
                    'Data': body_text,
                    'Charset': 'UTF-8'
                }
            }
        }
        
        # Add HTML body if provided
        if body_html:
            message['Body']['Html'] = {
                'Data': body_html,
                'Charset': 'UTF-8'
            }
        
        # Build destination
        destination = {'ToAddresses': to_addresses}
        if cc_addresses:
            destination['CcAddresses'] = cc_addresses
        if bcc_addresses:
            destination['BccAddresses'] = bcc_addresses
        
        # Build send_email parameters
        params = {
            'Source': FROM_EMAIL,
            'Destination': destination,
            'Message': message,
        }
        
        # Add optional parameters
        if reply_to:
            params['ReplyToAddresses'] = reply_to
        
        if CONFIGURATION_SET:
            params['ConfigurationSetName'] = CONFIGURATION_SET
        
        # Send the email
        response = ses_client.send_email(**params)
        
        logger.info(f"Email sent successfully to {to_addresses}", extra={
            'message_id': response['MessageId'],
            'subject': subject,
        })
        
        return response
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        logger.error(f"Failed to send email: {error_code} - {error_message}", extra={
            'to_addresses': to_addresses,
            'subject': subject,
            'error_code': error_code,
        })
        raise


def send_welcome_email(user_email: str, user_name: str, temporary_password: Optional[str] = None) -> Dict:
    """
    Send a welcome email to a new user.
    
    Args:
        user_email: User's email address
        user_name: User's display name
        temporary_password: Optional temporary password for new users
    
    Returns:
        Dict containing the SES response
    """
    subject = "Welcome to Celestium CMS"
    
    body_text = f"""
Hello {user_name},

Welcome to Celestium CMS! Your account has been created successfully.

"""
    
    body_html = f"""
<html>
<head></head>
<body>
    <h2>Welcome to Celestium CMS</h2>
    <p>Hello {user_name},</p>
    <p>Welcome to Celestium CMS! Your account has been created successfully.</p>
"""
    
    if temporary_password:
        body_text += f"""
Your temporary password is: {temporary_password}

Please log in and change your password as soon as possible.

Login URL: {os.environ.get('ADMIN_URL', 'https://admin.celestium.life')}

"""
        body_html += f"""
    <p><strong>Your temporary password is:</strong> <code>{temporary_password}</code></p>
    <p>Please log in and change your password as soon as possible.</p>
    <p><a href="{os.environ.get('ADMIN_URL', 'https://admin.celestium.life')}">Login to Admin Panel</a></p>
"""
    else:
        body_text += f"""
You can now log in to the admin panel.

Login URL: {os.environ.get('ADMIN_URL', 'https://admin.celestium.life')}

"""
        body_html += f"""
    <p>You can now log in to the admin panel.</p>
    <p><a href="{os.environ.get('ADMIN_URL', 'https://admin.celestium.life')}">Login to Admin Panel</a></p>
"""
    
    body_text += """
If you have any questions, please contact your administrator.

Best regards,
Celestium CMS Team
"""
    
    body_html += """
    <p>If you have any questions, please contact your administrator.</p>
    <p>Best regards,<br>Celestium CMS Team</p>
</body>
</html>
"""
    
    return send_email(
        to_addresses=[user_email],
        subject=subject,
        body_text=body_text,
        body_html=body_html
    )


def send_password_reset_email(user_email: str, user_name: str, reset_code: str) -> Dict:
    """
    Send a password reset email with verification code.
    
    Args:
        user_email: User's email address
        user_name: User's display name
        reset_code: Password reset verification code
    
    Returns:
        Dict containing the SES response
    """
    subject = "Password Reset Request - Celestium CMS"
    
    body_text = f"""
Hello {user_name},

We received a request to reset your password for Celestium CMS.

Your password reset code is: {reset_code}

If you didn't request this password reset, please ignore this email or contact your administrator.

This code will expire in 1 hour.

Best regards,
Celestium CMS Team
"""
    
    body_html = f"""
<html>
<head></head>
<body>
    <h2>Password Reset Request</h2>
    <p>Hello {user_name},</p>
    <p>We received a request to reset your password for Celestium CMS.</p>
    <p><strong>Your password reset code is:</strong> <code>{reset_code}</code></p>
    <p>If you didn't request this password reset, please ignore this email or contact your administrator.</p>
    <p><em>This code will expire in 1 hour.</em></p>
    <p>Best regards,<br>Celestium CMS Team</p>
</body>
</html>
"""
    
    return send_email(
        to_addresses=[user_email],
        subject=subject,
        body_text=body_text,
        body_html=body_html
    )


def send_comment_notification_email(
    admin_email: str,
    commenter_name: str,
    commenter_email: str,
    content_title: str,
    comment_text: str,
    comment_id: str
) -> Dict:
    """
    Send a notification email to admin when a new comment is posted.
    
    Args:
        admin_email: Administrator's email address
        commenter_name: Name of the person who commented
        commenter_email: Email of the person who commented
        content_title: Title of the content that was commented on
        comment_text: The comment text
        comment_id: ID of the comment for moderation
    
    Returns:
        Dict containing the SES response
    """
    subject = f"New Comment on '{content_title}'"
    
    # Truncate comment if too long
    comment_preview = comment_text[:200] + '...' if len(comment_text) > 200 else comment_text
    
    body_text = f"""
A new comment has been posted on '{content_title}'.

Commenter: {commenter_name} ({commenter_email})

Comment:
{comment_preview}

Moderate this comment:
{os.environ.get('ADMIN_URL', 'https://admin.celestium.life')}/comments

Best regards,
Celestium CMS
"""
    
    body_html = f"""
<html>
<head></head>
<body>
    <h2>New Comment Posted</h2>
    <p>A new comment has been posted on <strong>'{content_title}'</strong>.</p>
    <p><strong>Commenter:</strong> {commenter_name} ({commenter_email})</p>
    <h3>Comment:</h3>
    <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; color: #666;">
        {comment_preview}
    </blockquote>
    <p><a href="{os.environ.get('ADMIN_URL', 'https://admin.celestium.life')}/comments">Moderate this comment</a></p>
    <p>Best regards,<br>Celestium CMS</p>
</body>
</html>
"""
    
    return send_email(
        to_addresses=[admin_email],
        subject=subject,
        body_text=body_text,
        body_html=body_html
    )


def send_user_registration_email(user_email: str, user_name: str, verification_code: str) -> Dict:
    """
    Send an email verification link to a newly registered user.
    
    Args:
        user_email: User's email address
        user_name: User's display name
        verification_code: Email verification code
    
    Returns:
        Dict containing the SES response
    """
    subject = "Verify Your Email - Celestium CMS"
    
    verification_url = f"{os.environ.get('PUBLIC_URL', 'https://celestium.life')}/verify-email?code={verification_code}"
    
    body_text = f"""
Hello {user_name},

Thank you for registering with Celestium CMS!

Please verify your email address by entering this code: {verification_code}

Or click this link: {verification_url}

This verification code will expire in 24 hours.

If you didn't create this account, please ignore this email.

Best regards,
Celestium CMS Team
"""
    
    body_html = f"""
<html>
<head></head>
<body>
    <h2>Verify Your Email</h2>
    <p>Hello {user_name},</p>
    <p>Thank you for registering with Celestium CMS!</p>
    <p>Please verify your email address by entering this code:</p>
    <p style="font-size: 24px; font-weight: bold; color: #007bff;">{verification_code}</p>
    <p>Or click the button below:</p>
    <p><a href="{verification_url}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
    <p><em>This verification code will expire in 24 hours.</em></p>
    <p>If you didn't create this account, please ignore this email.</p>
    <p>Best regards,<br>Celestium CMS Team</p>
</body>
</html>
"""
    
    return send_email(
        to_addresses=[user_email],
        subject=subject,
        body_text=body_text,
        body_html=body_html
    )
