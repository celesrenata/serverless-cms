"""
Unit tests for email utility module.
"""

import pytest
import os
import sys
from unittest.mock import patch, MagicMock, call
from botocore.exceptions import ClientError

# Add lambda directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))


@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    """Set up environment variables for testing."""
    monkeypatch.setenv('SES_FROM_EMAIL', 'test@example.com')
    monkeypatch.setenv('SES_CONFIGURATION_SET', 'test-config-set')
    monkeypatch.setenv('SES_REGION', 'us-east-1')
    monkeypatch.setenv('ADMIN_URL', 'https://admin.test.com')
    monkeypatch.setenv('PUBLIC_URL', 'https://test.com')


@pytest.fixture
def mock_ses():
    """Mock boto3 SES client at module level."""
    with patch('shared.email.ses_client') as mock_client:
        mock_client.send_email.return_value = {
            'MessageId': 'test-message-id-12345',
            'ResponseMetadata': {
                'RequestId': 'test-request-id',
                'HTTPStatusCode': 200
            }
        }
        yield mock_client


def test_send_email_basic(mock_ses):
    """Test sending a basic email."""
    from shared.email import send_email
    
    response = send_email(
        to_addresses=['recipient@example.com'],
        subject='Test Subject',
        body_text='Test body text'
    )
    
    assert response['MessageId'] == 'test-message-id-12345'
    assert mock_ses.send_email.called
    
    call_args = mock_ses.send_email.call_args[1]
    assert call_args['Source'] == 'test@example.com'
    assert call_args['Destination']['ToAddresses'] == ['recipient@example.com']
    assert call_args['Message']['Subject']['Data'] == 'Test Subject'
    assert call_args['Message']['Body']['Text']['Data'] == 'Test body text'
    assert call_args['ConfigurationSetName'] == 'test-config-set'


def test_send_email_with_html(mock_ses):
    """Test sending an email with HTML body."""
    from shared.email import send_email
    
    response = send_email(
        to_addresses=['recipient@example.com'],
        subject='Test Subject',
        body_text='Test body text',
        body_html='<html><body>Test HTML</body></html>'
    )
    
    assert response['MessageId'] == 'test-message-id-12345'
    
    call_args = mock_ses.send_email.call_args[1]
    assert 'Html' in call_args['Message']['Body']
    assert call_args['Message']['Body']['Html']['Data'] == '<html><body>Test HTML</body></html>'


def test_send_email_with_cc_bcc(mock_ses):
    """Test sending an email with CC and BCC."""
    from shared.email import send_email
    
    response = send_email(
        to_addresses=['recipient@example.com'],
        subject='Test Subject',
        body_text='Test body text',
        cc_addresses=['cc@example.com'],
        bcc_addresses=['bcc@example.com']
    )
    
    assert response['MessageId'] == 'test-message-id-12345'
    
    call_args = mock_ses.send_email.call_args[1]
    assert call_args['Destination']['CcAddresses'] == ['cc@example.com']
    assert call_args['Destination']['BccAddresses'] == ['bcc@example.com']


def test_send_email_with_reply_to(mock_ses):
    """Test sending an email with reply-to address."""
    from shared.email import send_email
    
    response = send_email(
        to_addresses=['recipient@example.com'],
        subject='Test Subject',
        body_text='Test body text',
        reply_to=['reply@example.com']
    )
    
    assert response['MessageId'] == 'test-message-id-12345'
    
    call_args = mock_ses.send_email.call_args[1]
    assert call_args['ReplyToAddresses'] == ['reply@example.com']


def test_send_email_failure(mock_ses):
    """Test handling of SES send failure."""
    from shared.email import send_email
    
    # Mock a ClientError
    mock_ses.send_email.side_effect = ClientError(
        {
            'Error': {
                'Code': 'MessageRejected',
                'Message': 'Email address is not verified.'
            }
        },
        'SendEmail'
    )
    
    with pytest.raises(ClientError) as exc_info:
        send_email(
            to_addresses=['invalid@example.com'],
            subject='Test Subject',
            body_text='Test body text'
        )
    
    assert exc_info.value.response['Error']['Code'] == 'MessageRejected'


def test_send_welcome_email(mock_ses):
    """Test sending a welcome email."""
    from shared.email import send_welcome_email
    
    response = send_welcome_email(
        user_email='newuser@example.com',
        user_name='John Doe'
    )
    
    assert response['MessageId'] == 'test-message-id-12345'
    assert mock_ses.send_email.called
    
    call_args = mock_ses.send_email.call_args[1]
    assert call_args['Destination']['ToAddresses'] == ['newuser@example.com']
    assert 'Welcome to Celestium CMS' in call_args['Message']['Subject']['Data']
    assert 'John Doe' in call_args['Message']['Body']['Text']['Data']


def test_send_welcome_email_with_temp_password(mock_ses):
    """Test sending a welcome email with temporary password."""
    from shared.email import send_welcome_email
    
    response = send_welcome_email(
        user_email='newuser@example.com',
        user_name='John Doe',
        temporary_password='TempPass123!'
    )
    
    assert response['MessageId'] == 'test-message-id-12345'
    
    call_args = mock_ses.send_email.call_args[1]
    body_text = call_args['Message']['Body']['Text']['Data']
    body_html = call_args['Message']['Body']['Html']['Data']
    
    assert 'TempPass123!' in body_text
    assert 'TempPass123!' in body_html
    assert 'temporary password' in body_text.lower()


def test_send_password_reset_email(mock_ses):
    """Test sending a password reset email."""
    from shared.email import send_password_reset_email
    
    response = send_password_reset_email(
        user_email='user@example.com',
        user_name='Jane Doe',
        reset_code='ABC123'
    )
    
    assert response['MessageId'] == 'test-message-id-12345'
    
    call_args = mock_ses.send_email.call_args[1]
    assert call_args['Destination']['ToAddresses'] == ['user@example.com']
    assert 'Password Reset' in call_args['Message']['Subject']['Data']
    
    body_text = call_args['Message']['Body']['Text']['Data']
    body_html = call_args['Message']['Body']['Html']['Data']
    
    assert 'Jane Doe' in body_text
    assert 'ABC123' in body_text
    assert 'ABC123' in body_html


def test_send_comment_notification_email(mock_ses):
    """Test sending a comment notification email."""
    from shared.email import send_comment_notification_email
    
    response = send_comment_notification_email(
        admin_email='admin@example.com',
        commenter_name='Commenter Name',
        commenter_email='commenter@example.com',
        content_title='Test Blog Post',
        comment_text='This is a test comment.',
        comment_id='comment-123'
    )
    
    assert response['MessageId'] == 'test-message-id-12345'
    
    call_args = mock_ses.send_email.call_args[1]
    assert call_args['Destination']['ToAddresses'] == ['admin@example.com']
    assert 'Test Blog Post' in call_args['Message']['Subject']['Data']
    
    body_text = call_args['Message']['Body']['Text']['Data']
    assert 'Commenter Name' in body_text
    assert 'commenter@example.com' in body_text
    assert 'This is a test comment.' in body_text


def test_send_comment_notification_email_long_comment(mock_ses):
    """Test sending a comment notification with a long comment (should be truncated)."""
    from shared.email import send_comment_notification_email
    
    long_comment = 'A' * 300  # 300 characters
    
    response = send_comment_notification_email(
        admin_email='admin@example.com',
        commenter_name='Commenter Name',
        commenter_email='commenter@example.com',
        content_title='Test Blog Post',
        comment_text=long_comment,
        comment_id='comment-123'
    )
    
    assert response['MessageId'] == 'test-message-id-12345'
    
    call_args = mock_ses.send_email.call_args[1]
    body_text = call_args['Message']['Body']['Text']['Data']
    
    # Should be truncated to 200 chars + '...'
    assert '...' in body_text
    assert len([line for line in body_text.split('\n') if 'A' in line][0]) <= 203


def test_send_user_registration_email(mock_ses):
    """Test sending a user registration verification email."""
    from shared.email import send_user_registration_email
    
    response = send_user_registration_email(
        user_email='newuser@example.com',
        user_name='New User',
        verification_code='VERIFY123'
    )
    
    assert response['MessageId'] == 'test-message-id-12345'
    
    call_args = mock_ses.send_email.call_args[1]
    assert call_args['Destination']['ToAddresses'] == ['newuser@example.com']
    assert 'Verify Your Email' in call_args['Message']['Subject']['Data']
    
    body_text = call_args['Message']['Body']['Text']['Data']
    body_html = call_args['Message']['Body']['Html']['Data']
    
    assert 'New User' in body_text
    assert 'VERIFY123' in body_text
    assert 'VERIFY123' in body_html
    assert 'verify-email?code=VERIFY123' in body_text


def test_send_email_multiple_recipients(mock_ses):
    """Test sending an email to multiple recipients."""
    from shared.email import send_email
    
    response = send_email(
        to_addresses=['user1@example.com', 'user2@example.com', 'user3@example.com'],
        subject='Test Subject',
        body_text='Test body text'
    )
    
    assert response['MessageId'] == 'test-message-id-12345'
    
    call_args = mock_ses.send_email.call_args[1]
    assert len(call_args['Destination']['ToAddresses']) == 3
    assert 'user1@example.com' in call_args['Destination']['ToAddresses']
    assert 'user2@example.com' in call_args['Destination']['ToAddresses']
    assert 'user3@example.com' in call_args['Destination']['ToAddresses']
