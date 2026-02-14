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
os.environ['MEDIA_BUCKET'] = 'test-cms-media-bucket'
os.environ['COGNITO_REGION'] = 'us-east-1'
os.environ['USER_POOL_ID'] = 'test-pool-id'
os.environ['USER_POOL_CLIENT_ID'] = 'test-client-id'


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
