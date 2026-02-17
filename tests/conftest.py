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
def api_client(dynamodb_mock, mock_cognito, monkeypatch):
    """API client that invokes actual Lambda handlers."""
    import json
    import sys
    import os
    import boto3
    import uuid
    
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
    
    # Configure mock_cognito to return proper responses
    created_users = {}  # Track created users by email
    
    # Pre-populate with test user email from test_user fixture
    created_users['testuser@example.com'] = 'test-user-id'
    
    def mock_admin_create_user(**kwargs):
        email = None
        for attr in kwargs.get('UserAttributes', []):
            if attr['Name'] == 'email':
                email = attr['Value']
                break
        
        # Check for duplicate
        if email and email in created_users:
            raise mock_cognito.exceptions.UsernameExistsException(
                {'Error': {'Code': 'UsernameExistsException', 'Message': 'User already exists'}}
            )
        
        user_id = str(uuid.uuid4())
        if email:
            created_users[email] = user_id
        
        return {
            'User': {
                'Username': user_id,
                'Attributes': kwargs.get('UserAttributes', []),
                'UserStatus': 'FORCE_CHANGE_PASSWORD'
            }
        }
    
    mock_cognito.admin_create_user.side_effect = mock_admin_create_user
    mock_cognito.admin_delete_user.return_value = {}
    
    # Save original boto3.client before patching
    original_boto3_client = boto3.client
    
    # Mock boto3 Cognito client
    def mock_boto3_client(service_name, *args, **kwargs):
        if service_name == 'cognito-idp':
            return mock_cognito
        elif service_name == 'ses':
            # Mock SES for email sending
            from unittest.mock import MagicMock
            return MagicMock()
        # Use original client for other services
        return original_boto3_client(service_name, *args, **kwargs)
    
    monkeypatch.setattr(boto3, 'client', mock_boto3_client)
    
    # Mock the require_auth decorator to support role-based testing
    from shared import auth
    
    def mock_require_auth(roles=None):
        """Mock decorator that checks token and injects appropriate user/role."""
        def decorator(func):
            def wrapper(event, context, *args, **kwargs):
                # Extract token from Authorization header
                headers = event.get('headers', {})
                auth_header = headers.get('Authorization', '')
                
                # Determine role based on token
                if 'admin' in auth_header.lower():
                    test_user_id = 'test-admin-id'
                    test_role = 'admin'
                elif 'editor' in auth_header.lower():
                    test_user_id = 'test-editor-id'
                    test_role = 'editor'
                elif 'author' in auth_header.lower():
                    test_user_id = 'test-author-id'
                    test_role = 'author'
                else:
                    # No valid token - return 401
                    return {
                        'statusCode': 401,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                        'body': json.dumps({'error': 'Unauthorized'})
                    }
                
                # Check if user has required role
                if roles and test_role not in roles:
                    return {
                        'statusCode': 403,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                        },
                        'body': json.dumps({'error': 'Forbidden'})
                    }
                
                return func(event, context, test_user_id, test_role, *args, **kwargs)
            return wrapper
        return decorator
    
    monkeypatch.setattr(auth, 'require_auth', mock_require_auth)

    
    class MockResponse:
        def __init__(self, status_code, data):
            self.status_code = status_code
            self._data = data
        
        def json(self):
            return self._data
    
    class ApiClient:
        def __init__(self):
            self.handlers = {}
            self._load_handlers()
        
        def _load_handlers(self):
            """Load Lambda handlers for different endpoints."""
            # Import handlers
            from users.create import handler as create_user_handler
            from users.update import handler as update_user_handler
            from users.delete import handler as delete_user_handler
            from users.list import handler as list_users_handler
            from users.reset_password import handler as reset_password_handler
            from comments.create import handler as create_comment_handler
            from comments.list import handler as list_comments_handler
            from comments.update import handler as update_comment_handler
            from comments.delete import handler as delete_comment_handler
            
            # Map endpoints to handlers
            self.handlers = {
                ('POST', '/api/v1/users'): create_user_handler,
                ('PUT', '/api/v1/users'): update_user_handler,
                ('DELETE', '/api/v1/users'): delete_user_handler,
                ('GET', '/api/v1/users'): list_users_handler,
                ('POST', '/api/v1/users/reset-password'): reset_password_handler,
                ('POST', '/api/v1/content/comments'): create_comment_handler,
                ('GET', '/api/v1/content/comments'): list_comments_handler,
                ('PUT', '/api/v1/content/comments'): update_comment_handler,
                ('DELETE', '/api/v1/content/comments'): delete_comment_handler,
            }
        
        def _create_event(self, method, path, json_data=None, headers=None, query_params=None):
            """Create a Lambda event from request parameters."""
            event = {
                'httpMethod': method,
                'path': path,
                'headers': headers or {},
                'queryStringParameters': query_params or {},
                'requestContext': {
                    'identity': {
                        'sourceIp': '127.0.0.1'
                    }
                }
            }
            
            if json_data:
                event['body'] = json.dumps(json_data)
            
            return event
        
        def _extract_path_params(self, path):
            """Extract path parameters from URL."""
            parts = path.split('/')
            params = {}
            
            # Extract user id from /api/v1/users/{id}
            if len(parts) >= 5 and parts[3] == 'users' and parts[4] and parts[4] != 'reset-password':
                params['id'] = parts[4]
            
            # Extract content_id and comment_id
            if 'comments' in path:
                content_parts = path.split('/content/')
                if len(content_parts) > 1:
                    content_and_rest = content_parts[1].split('/comments')
                    params['content_id'] = content_and_rest[0]
                    if len(content_and_rest) > 1 and content_and_rest[1]:
                        comment_id = content_and_rest[1].strip('/')
                        if comment_id:
                            params['id'] = comment_id
            
            return params
        
        def post(self, path, data=None, headers=None, json=None):
            """Handle POST requests."""
            # Support both 'data' and 'json' parameters for compatibility
            json_data = json if json is not None else data
            
            # Normalize path for handler lookup
            base_path = path.split('?')[0]
            
            # Handle parameterized paths
            if '/content/' in base_path and '/comments' in base_path:
                lookup_path = '/api/v1/content/comments'
            elif base_path.startswith('/api/v1/users/') and 'reset-password' in base_path:
                lookup_path = '/api/v1/users/reset-password'
            else:
                lookup_path = base_path
            
            handler = self.handlers.get(('POST', lookup_path))
            if not handler:
                return MockResponse(404, {'error': 'Not found'})
            
            event = self._create_event('POST', path, json_data, headers)
            path_params = self._extract_path_params(path)
            event['pathParameters'] = path_params
            
            try:
                import json as json_module
                response = handler(event, {})
                body = response.get('body', {})
                if isinstance(body, str):
                    body = json_module.loads(body)
                return MockResponse(response.get('statusCode', 200), body)
            except Exception as e:
                print(f"Error in POST {path}: {e}")
                import traceback
                traceback.print_exc()
                return MockResponse(500, {'error': str(e)})
        
        def get(self, path, headers=None, params=None):
            """Handle GET requests."""
            base_path = path.split('?')[0]
            
            # Handle parameterized paths
            if '/content/' in base_path and '/comments' in base_path:
                lookup_path = '/api/v1/content/comments'
            else:
                lookup_path = base_path
            
            handler = self.handlers.get(('GET', lookup_path))
            if not handler:
                return MockResponse(404, {'error': 'Not found'})
            
            event = self._create_event('GET', path, headers=headers, query_params=params)
            path_params = self._extract_path_params(path)
            event['pathParameters'] = path_params
            
            try:
                import json as json_module
                response = handler(event, {})
                body = response.get('body', {})
                if isinstance(body, str):
                    body = json_module.loads(body)
                return MockResponse(response.get('statusCode', 200), body)
            except Exception as e:
                print(f"Error in GET {path}: {e}")
                import traceback
                traceback.print_exc()
                return MockResponse(500, {'error': str(e)})
        
        def put(self, path, data=None, headers=None, json=None):
            """Handle PUT requests."""
            # Support both 'data' and 'json' parameters for compatibility
            json_data = json if json is not None else data
            
            base_path = path.split('?')[0]
            
            # Handle parameterized paths
            if '/content/' in base_path and '/comments' in base_path:
                lookup_path = '/api/v1/content/comments'
            elif '/users/' in base_path:
                lookup_path = '/api/v1/users'
            else:
                lookup_path = base_path
            
            handler = self.handlers.get(('PUT', lookup_path))
            if not handler:
                return MockResponse(404, {'error': 'Not found'})
            
            event = self._create_event('PUT', path, json_data, headers)
            path_params = self._extract_path_params(path)
            event['pathParameters'] = path_params
            
            try:
                import json as json_module
                response = handler(event, {})
                body = response.get('body', {})
                if isinstance(body, str):
                    body = json_module.loads(body)
                return MockResponse(response.get('statusCode', 200), body)
            except Exception as e:
                print(f"Error in PUT {path}: {e}")
                import traceback
                traceback.print_exc()
                return MockResponse(500, {'error': str(e)})
        
        def delete(self, path, headers=None):
            """Handle DELETE requests."""
            base_path = path.split('?')[0]
            
            # Handle parameterized paths
            if '/content/' in base_path and '/comments' in base_path:
                lookup_path = '/api/v1/content/comments'
            elif '/users/' in base_path:
                lookup_path = '/api/v1/users'
            else:
                lookup_path = base_path
            
            handler = self.handlers.get(('DELETE', lookup_path))
            if not handler:
                return MockResponse(404, {'error': 'Not found'})
            
            event = self._create_event('DELETE', path, headers=headers)
            path_params = self._extract_path_params(path)
            event['pathParameters'] = path_params
            
            try:
                import json as json_module
                response = handler(event, {})
                body = response.get('body', {})
                if isinstance(body, str):
                    body = json_module.loads(body)
                return MockResponse(response.get('statusCode', 200), body)
            except Exception as e:
                print(f"Error in DELETE {path}: {e}")
                import traceback
                traceback.print_exc()
                return MockResponse(500, {'error': str(e)})
    
    return ApiClient()


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
