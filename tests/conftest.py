"""
Pytest configuration and shared fixtures for integration tests.
"""
import os
import pytest
import boto3
from moto import mock_aws
import uuid

# Set test environment variables before any imports
os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
os.environ['AWS_SECURITY_TOKEN'] = 'testing'
os.environ['AWS_SESSION_TOKEN'] = 'testing'
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
os.environ['CONTENT_TABLE'] = 'test-cms-content'
os.environ['MEDIA_TABLE'] = 'test-cms-media'
os.environ['USERS_TABLE'] = 'test-cms-users'
os.environ['SETTINGS_TABLE'] = 'test-cms-settings'
os.environ['PLUGINS_TABLE'] = 'test-cms-plugins'
os.environ['COMMENTS_TABLE'] = 'test-cms-comments'
os.environ['MEDIA_BUCKET'] = 'test-cms-media-bucket'
os.environ['COGNITO_REGION'] = 'us-east-1'
os.environ['USER_POOL_ID'] = 'test-pool-id'
os.environ['USER_POOL_CLIENT_ID'] = 'test-client-id'
os.environ['SES_FROM_EMAIL'] = 'test@example.com'
os.environ['SES_CONFIGURATION_SET'] = 'test-config-set'


@pytest.fixture(scope='session', autouse=True)
def aws_credentials():
    """Set AWS credentials for all tests at session level."""
    os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
    os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
    os.environ['AWS_SECURITY_TOKEN'] = 'testing'
    os.environ['AWS_SESSION_TOKEN'] = 'testing'
    os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'


@pytest.fixture(scope='function', autouse=True)
def aws_mock():
    """Enable AWS mocking for all tests."""
    with mock_aws():
        # Create all tables within the mock context
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        
        # Create content table
        dynamodb.create_table(
            TableName=os.environ['CONTENT_TABLE'],
            KeySchema=[
                {'AttributeName': 'id', 'KeyType': 'HASH'},
                {'AttributeName': 'type#timestamp', 'KeyType': 'RANGE'},
            ],
            AttributeDefinitions=[
                {'AttributeName': 'id', 'AttributeType': 'S'},
                {'AttributeName': 'type#timestamp', 'AttributeType': 'S'},
                {'AttributeName': 'slug', 'AttributeType': 'S'},
                {'AttributeName': 'type', 'AttributeType': 'S'},
                {'AttributeName': 'published_at', 'AttributeType': 'N'},
                {'AttributeName': 'status', 'AttributeType': 'S'},
                {'AttributeName': 'scheduled_at', 'AttributeType': 'N'},
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'slug-index',
                    'KeySchema': [
                        {'AttributeName': 'slug', 'KeyType': 'HASH'},
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                },
                {
                    'IndexName': 'type-published_at-index',
                    'KeySchema': [
                        {'AttributeName': 'type', 'KeyType': 'HASH'},
                        {'AttributeName': 'published_at', 'KeyType': 'RANGE'},
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                },
                {
                    'IndexName': 'status-scheduled_at-index',
                    'KeySchema': [
                        {'AttributeName': 'status', 'KeyType': 'HASH'},
                        {'AttributeName': 'scheduled_at', 'KeyType': 'RANGE'},
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                },
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        
        # Create media table
        dynamodb.create_table(
            TableName=os.environ['MEDIA_TABLE'],
            KeySchema=[
                {'AttributeName': 'id', 'KeyType': 'HASH'},
            ],
            AttributeDefinitions=[
                {'AttributeName': 'id', 'AttributeType': 'S'},
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        
        # Create users table
        dynamodb.create_table(
            TableName=os.environ['USERS_TABLE'],
            KeySchema=[
                {'AttributeName': 'id', 'KeyType': 'HASH'},
            ],
            AttributeDefinitions=[
                {'AttributeName': 'id', 'AttributeType': 'S'},
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        
        # Create settings table
        dynamodb.create_table(
            TableName=os.environ['SETTINGS_TABLE'],
            KeySchema=[
                {'AttributeName': 'key', 'KeyType': 'HASH'},
            ],
            AttributeDefinitions=[
                {'AttributeName': 'key', 'AttributeType': 'S'},
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        
        # Create plugins table
        dynamodb.create_table(
            TableName=os.environ['PLUGINS_TABLE'],
            KeySchema=[
                {'AttributeName': 'id', 'KeyType': 'HASH'},
            ],
            AttributeDefinitions=[
                {'AttributeName': 'id', 'AttributeType': 'S'},
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        
        # Create comments table
        dynamodb.create_table(
            TableName=os.environ['COMMENTS_TABLE'],
            KeySchema=[
                {'AttributeName': 'id', 'KeyType': 'HASH'},
                {'AttributeName': 'created_at', 'KeyType': 'RANGE'},
            ],
            AttributeDefinitions=[
                {'AttributeName': 'id', 'AttributeType': 'S'},
                {'AttributeName': 'created_at', 'AttributeType': 'N'},
                {'AttributeName': 'content_id', 'AttributeType': 'S'},
                {'AttributeName': 'status', 'AttributeType': 'S'},
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'content_id-created_at-index',
                    'KeySchema': [
                        {'AttributeName': 'content_id', 'KeyType': 'HASH'},
                        {'AttributeName': 'created_at', 'KeyType': 'RANGE'},
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                },
                {
                    'IndexName': 'status-created_at-index',
                    'KeySchema': [
                        {'AttributeName': 'status', 'KeyType': 'HASH'},
                        {'AttributeName': 'created_at', 'KeyType': 'RANGE'},
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                },
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        
        # Create S3 bucket
        s3 = boto3.client('s3', region_name='us-east-1')
        s3.create_bucket(Bucket=os.environ['MEDIA_BUCKET'])
        
        yield


@pytest.fixture(scope='function')
def dynamodb_mock():
    """Get DynamoDB resource (tables already created by aws_mock)."""
    return boto3.resource('dynamodb', region_name='us-east-1')


@pytest.fixture(scope='function')
def s3_mock():
    """Get S3 client (bucket already created by aws_mock)."""
    return boto3.client('s3', region_name='us-east-1')


@pytest.fixture
def test_user_id():
    """Generate a test user ID."""
    return str(uuid.uuid4())


@pytest.fixture
def test_content_data():
    """Sample content data for testing."""
    return {
        'title': 'Test Blog Post',
        'slug': 'test-blog-post',
        'content': '<p>This is test content</p>',
        'excerpt': 'Test excerpt',
        'type': 'post',
        'status': 'draft',
        'metadata': {
            'seo_title': 'Test SEO Title',
            'seo_description': 'Test SEO description',
            'tags': ['test', 'blog'],
            'categories': ['technology']
        }
    }


@pytest.fixture
def test_media_data():
    """Sample media data for testing."""
    return {
        'filename': 'test-image.jpg',
        'mime_type': 'image/jpeg',
        'size': 1024000,
        'dimensions': {
            'width': 1920,
            'height': 1080
        },
        'metadata': {
            'alt_text': 'Test image',
            'caption': 'A test image'
        }
    }


@pytest.fixture
def test_plugin_data():
    """Sample plugin data for testing."""
    return {
        'id': 'test-plugin',
        'name': 'Test Plugin',
        'version': '1.0.0',
        'description': 'A test plugin',
        'author': 'Test Author',
        'active': False,
        'hooks': [
            {
                'hook_name': 'content_render_post',
                'function_arn': 'arn:aws:lambda:us-east-1:123456789:function:test-plugin',
                'priority': 10
            }
        ],
        'config_schema': {
            'type': 'object',
            'properties': {
                'enabled': {'type': 'boolean'}
            }
        }
    }


@pytest.fixture
def mock_context():
    """Mock Lambda context."""
    class MockContext:
        function_name: str = 'test-function'
        memory_limit_in_mb: int = 128
        invoked_function_arn: str = 'arn:aws:lambda:us-east-1:123456789:function:test'
        aws_request_id: str = str(uuid.uuid4())
        
        def get_remaining_time_in_millis(self):
            return 30000
    
    return MockContext()


@pytest.fixture
def mock_cognito():
    """Mock Cognito client for testing."""
    from unittest.mock import MagicMock
    
    cognito = MagicMock()
    
    # Create mock exception classes
    cognito.exceptions.UserNotFoundException = type('UserNotFoundException', (Exception,), {})
    cognito.exceptions.CodeMismatchException = type('CodeMismatchException', (Exception,), {})
    cognito.exceptions.ExpiredCodeException = type('ExpiredCodeException', (Exception,), {})
    cognito.exceptions.UsernameExistsException = type('UsernameExistsException', (Exception,), {})
    
    return cognito


@pytest.fixture
def mock_ses():
    """Mock SES client for testing."""
    with mock_aws():
        ses = boto3.client('ses', region_name='us-east-1')
        
        # Verify email identity
        ses.verify_email_identity(EmailAddress='no-reply@celestium.life')
        
        yield ses



# Phase 2 Fixtures

@pytest.fixture
def test_comment_data():
    """Sample comment data for testing."""
    return {
        'author_name': 'Test Commenter',
        'author_email': 'commenter@example.com',
        'comment_text': 'This is a test comment.',
        'status': 'pending',
        'ip_address': '192.168.1.1'
    }


@pytest.fixture
def published_post(dynamodb_mock, test_user_id):
    """Create a published post for testing."""
    import sys
    import os
    from datetime import datetime
    
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
    from shared.db import ContentRepository
    
    content_repo = ContentRepository()
    now = int(datetime.now().timestamp())
    post_id = str(uuid.uuid4())
    
    post_data = {
        'id': post_id,
        'type#timestamp': f"post#{now}",
        'type': 'post',
        'title': 'Test Published Post',
        'slug': 'test-published-post',
        'content': '<p>This is a published post for testing</p>',
        'excerpt': 'Test excerpt',
        'author': test_user_id,
        'status': 'published',
        'metadata': {},
        'created_at': now,
        'updated_at': now,
        'published_at': now
    }
    
    return content_repo.create(post_data)


@pytest.fixture
def draft_post(dynamodb_mock, test_user_id):
    """Create a draft post for testing."""
    import sys
    import os
    from datetime import datetime
    
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
    from shared.db import ContentRepository
    
    content_repo = ContentRepository()
    now = int(datetime.now().timestamp())
    post_id = str(uuid.uuid4())
    
    post_data = {
        'id': post_id,
        'type#timestamp': f"post#{now}",
        'type': 'post',
        'title': 'Test Draft Post',
        'slug': 'test-draft-post',
        'content': '<p>This is a draft post for testing</p>',
        'excerpt': 'Test excerpt',
        'author': test_user_id,
        'status': 'draft',
        'metadata': {},
        'created_at': now,
        'updated_at': now
    }
    
    return content_repo.create(post_data)


@pytest.fixture
def approved_comment(dynamodb_mock, published_post, test_user_id):
    """Create an approved comment for testing."""
    import sys
    import os
    from datetime import datetime
    
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
    from shared.db import CommentRepository
    
    comment_repo = CommentRepository()
    now = int(datetime.now().timestamp())
    comment_id = str(uuid.uuid4())
    
    comment_data = {
        'id': comment_id,
        'content_id': published_post['id'],
        'author_name': 'Approved Commenter',
        'author_email': 'approved@example.com',
        'comment_text': 'This is an approved comment.',
        'status': 'approved',
        'ip_address': '192.168.1.1',
        'moderated_by': test_user_id,
        'created_at': now,
        'updated_at': now
    }
    
    return comment_repo.create(comment_data)


@pytest.fixture
def pending_comment(dynamodb_mock, published_post):
    """Create a pending comment for testing."""
    import sys
    import os
    from datetime import datetime
    
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
    from shared.db import CommentRepository
    
    comment_repo = CommentRepository()
    now = int(datetime.now().timestamp())
    comment_id = str(uuid.uuid4())
    
    comment_data = {
        'id': comment_id,
        'content_id': published_post['id'],
        'author_name': 'Pending Commenter',
        'author_email': 'pending@example.com',
        'comment_text': 'This is a pending comment.',
        'status': 'pending',
        'ip_address': '192.168.1.2',
        'created_at': now,
        'updated_at': now
    }
    
    return comment_repo.create(comment_data)


@pytest.fixture
def test_user(dynamodb_mock):
    """Create a test user for testing."""
    import sys
    import os
    from datetime import datetime
    
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
    from shared.db import UserRepository
    
    user_repo = UserRepository()
    now = int(datetime.now().timestamp())
    user_id = str(uuid.uuid4())
    
    user_data = {
        'id': user_id,
        'email': 'testuser@example.com',
        'name': 'Test User',
        'role': 'author',
        'created_at': now,
        'last_login': now
    }
    
    return user_repo.create(user_data)


@pytest.fixture
def admin_user(dynamodb_mock):
    """Create an admin user for testing."""
    import sys
    import os
    from datetime import datetime
    
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
    from shared.db import UserRepository
    
    user_repo = UserRepository()
    now = int(datetime.now().timestamp())
    user_id = str(uuid.uuid4())
    
    user_data = {
        'id': user_id,
        'email': 'admin@example.com',
        'name': 'Admin User',
        'role': 'admin',
        'created_at': now,
        'last_login': now
    }
    
    return user_repo.create(user_data)


@pytest.fixture
def api_client():
    """Mock API client for testing."""
    from unittest.mock import MagicMock
    
    client = MagicMock()
    
    # Mock response object
    class MockResponse:
        def __init__(self, status_code, data):
            self.status_code = status_code
            self._data = data
        
        def json(self):
            return self._data
    
    # Configure mock methods to return MockResponse
    client.get.return_value = MockResponse(200, {})
    client.post.return_value = MockResponse(201, {})
    client.put.return_value = MockResponse(200, {})
    client.delete.return_value = MockResponse(200, {})
    
    return client


@pytest.fixture
def admin_token():
    """Mock admin JWT token."""
    return "mock-admin-token"


@pytest.fixture
def editor_token():
    """Mock editor JWT token."""
    return "mock-editor-token"


@pytest.fixture
def author_token():
    """Mock author JWT token."""
    return "mock-author-token"


@pytest.fixture
def disable_comments(dynamodb_mock):
    """Disable comments in settings."""
    import sys
    import os
    from datetime import datetime
    
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
    from shared.db import SettingsRepository
    
    settings_repo = SettingsRepository()
    now = int(datetime.now().timestamp())
    
    settings_repo.update_setting(
        'comments_enabled',
        False,
        updated_by='test-admin',
        updated_at=now
    )
    
    yield
    
    # Re-enable after test
    settings_repo.update_setting(
        'comments_enabled',
        True,
        updated_by='test-admin',
        updated_at=now
    )


@pytest.fixture
def enable_registration(dynamodb_mock):
    """Enable user registration in settings."""
    import sys
    import os
    from datetime import datetime
    
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
    from shared.db import SettingsRepository
    
    settings_repo = SettingsRepository()
    now = int(datetime.now().timestamp())
    
    settings_repo.update_setting(
        'registration_enabled',
        True,
        updated_by='test-admin',
        updated_at=now
    )
    
    yield
    
    # Disable after test
    settings_repo.update_setting(
        'registration_enabled',
        False,
        updated_by='test-admin',
        updated_at=now
    )
