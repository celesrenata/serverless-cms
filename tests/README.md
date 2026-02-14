# Integration Tests for Serverless CMS

This directory contains integration tests for the Serverless CMS API endpoints and core functionality.

## Test Coverage

The test suite covers the following areas:

### 1. Content Management (`test_content_integration.py`)
- Content lifecycle (create, read, update, delete)
- Content retrieval by ID and slug
- Content listing with filters and pagination
- Scheduled publishing
- Duplicate slug validation
- Status transitions (draft → published → archived)

### 2. Media Management (`test_media_integration.py`)
- File upload to S3
- Thumbnail generation for images
- Media metadata storage in DynamoDB
- Media listing and retrieval
- File and thumbnail deletion

### 3. Authentication & Authorization (`test_auth_integration.py`)
- User creation and management
- Role-based access control (admin, editor, author, viewer)
- User profile updates
- Permission validation

### 4. Plugin System (`test_plugin_integration.py`)
- Plugin installation
- Plugin activation and deactivation
- Plugin listing (all and active only)
- Plugin hooks registration
- Plugin settings storage and retrieval
- Hook priority ordering
- Configuration schema validation

### 5. Scheduled Publishing (`test_scheduler_integration.py`)
- Retrieving scheduled content
- Publishing content at scheduled time
- Multiple scheduled items handling
- Content visibility before/after publishing
- Timestamp preservation

## Setup

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Environment Variables

The tests use mocked AWS services (DynamoDB, S3, Cognito) via `moto`. Environment variables are set automatically in `conftest.py`.

## Running Tests

### Run All Tests

```bash
pytest tests/
```

### Run Specific Test File

```bash
pytest tests/test_content_integration.py
```

### Run Specific Test Class

```bash
pytest tests/test_content_integration.py::TestContentLifecycle
```

### Run Specific Test

```bash
pytest tests/test_content_integration.py::TestContentLifecycle::test_create_content_success
```

### Run with Verbose Output

```bash
pytest tests/ -v
```

### Run with Coverage Report

```bash
pytest tests/ --cov=lambda --cov-report=html
```

## Test Structure

### Fixtures (`conftest.py`)

The test suite uses pytest fixtures for:
- **aws_credentials**: Mock AWS credentials
- **dynamodb_mock**: Mock DynamoDB tables with proper schema
- **s3_mock**: Mock S3 bucket
- **test_user_id**: Sample user ID
- **test_content_data**: Sample content data
- **test_media_data**: Sample media data
- **test_plugin_data**: Sample plugin data
- **mock_context**: Mock Lambda context

### Test Organization

Tests are organized by functionality:
- Each test file focuses on a specific domain (content, media, auth, plugins, scheduler)
- Test classes group related tests
- Test methods follow naming convention: `test_<action>_<expected_result>`

## Mocking Strategy

The tests use `moto` to mock AWS services:
- **DynamoDB**: Full table structure with GSIs
- **S3**: Bucket operations and file storage
- **Cognito**: User pool (for future auth tests)

This allows tests to run without actual AWS resources and provides:
- Fast execution
- No AWS costs
- Consistent test environment
- Isolation between tests

## Adding New Tests

When adding new tests:

1. Create a new test file or add to existing one
2. Use appropriate fixtures from `conftest.py`
3. Follow the existing naming conventions
4. Test both success and error cases
5. Clean up resources (handled automatically by fixtures)
6. Document complex test scenarios

Example:

```python
def test_new_feature(self, dynamodb_mock, test_user_id):
    """Test description of what this test validates."""
    # Arrange
    # ... setup test data
    
    # Act
    # ... perform the action
    
    # Assert
    # ... verify the results
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
- No external dependencies required
- Fast execution (< 1 minute for full suite)
- Deterministic results
- Clear failure messages

## Troubleshooting

### Import Errors

If you encounter import errors, ensure the lambda directory is in the Python path:

```python
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
```

### Mock Service Issues

If moto mocks aren't working:
- Ensure `aws_credentials` fixture is used
- Check that environment variables are set correctly
- Verify moto version compatibility

### Test Failures

Common causes:
- Missing fixtures
- Incorrect table schema in mocks
- Timing issues with timestamps
- Missing environment variables

## Future Enhancements

Potential additions to the test suite:
- End-to-end API tests with actual HTTP requests
- Performance tests for Lambda functions
- Load testing for concurrent operations
- Security tests for authentication flows
- Integration with actual AWS services (optional)
