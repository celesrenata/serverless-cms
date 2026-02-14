# Testing Guide for Serverless CMS

This guide provides comprehensive information about testing the Serverless CMS system.

## Overview

The Serverless CMS test suite includes integration tests that validate the core functionality of the system without requiring actual AWS resources. Tests use mocked AWS services to ensure fast, reliable, and cost-free testing.

## Test Categories

### 1. Content Management Tests
**File**: `test_content_integration.py`

Tests the complete content lifecycle:
- ✅ Create content with validation
- ✅ Retrieve content by ID and slug
- ✅ Update content and preserve timestamps
- ✅ Delete content
- ✅ List content with filters and pagination
- ✅ Handle duplicate slugs
- ✅ Schedule content for future publishing
- ✅ Manage content status transitions

**Key Requirements Tested**: 1.1-1.5, 3.1-3.5, 4.1-4.5, 6.3-6.4, 13.1-13.5, 15.1-15.4

### 2. Media Management Tests
**File**: `test_media_integration.py`

Tests media upload and management:
- ✅ Upload files to S3
- ✅ Generate image thumbnails (small, medium, large)
- ✅ Store media metadata in DynamoDB
- ✅ List and retrieve media files
- ✅ Delete files and thumbnails
- ✅ Handle different file types

**Key Requirements Tested**: 2.1-2.5

### 3. Authentication & Authorization Tests
**File**: `test_auth_integration.py`

Tests user management and permissions:
- ✅ Create and manage users
- ✅ Role-based access control (admin, editor, author, viewer)
- ✅ Update user profiles
- ✅ List users
- ✅ Validate role permissions

**Key Requirements Tested**: 5.1-5.5

### 4. Plugin System Tests
**File**: `test_plugin_integration.py`

Tests the plugin architecture:
- ✅ Install plugins
- ✅ Activate and deactivate plugins
- ✅ List all and active plugins
- ✅ Register plugin hooks
- ✅ Store and retrieve plugin settings
- ✅ Validate configuration schemas
- ✅ Handle hook priorities

**Key Requirements Tested**: 16.1-16.5, 17.1-17.5, 18.1-18.3, 19.1-19.5, 20.1-20.5

### 5. Scheduled Publishing Tests
**File**: `test_scheduler_integration.py`

Tests scheduled content publishing:
- ✅ Retrieve scheduled content
- ✅ Publish content at scheduled time
- ✅ Handle multiple scheduled items
- ✅ Validate content visibility rules
- ✅ Preserve original timestamps

**Key Requirements Tested**: 15.1-15.4

## Setup Instructions

### Prerequisites

- Python 3.12 or higher
- pip (Python package manager)

### Installation

1. **Create a virtual environment** (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install test dependencies**:
   ```bash
   pip install -r tests/requirements.txt
   ```

### Dependencies

The test suite requires:
- `pytest` - Test framework
- `pytest-asyncio` - Async test support
- `requests` - HTTP client
- `boto3` - AWS SDK
- `moto` - AWS service mocking
- `python-jose` - JWT handling
- `Pillow` - Image processing
- `jsonschema` - Schema validation

## Running Tests

### Quick Start

Use the provided test runner script:

```bash
./tests/run_tests.sh
```

### Manual Execution

#### Run all tests:
```bash
pytest tests/
```

#### Run with verbose output:
```bash
pytest tests/ -v
```

#### Run specific test file:
```bash
pytest tests/test_content_integration.py
```

#### Run specific test class:
```bash
pytest tests/test_content_integration.py::TestContentLifecycle
```

#### Run specific test:
```bash
pytest tests/test_content_integration.py::TestContentLifecycle::test_create_content_success
```

#### Run tests by marker:
```bash
pytest tests/ -m content
pytest tests/ -m auth
pytest tests/ -m plugins
```

### Coverage Reports

#### Generate coverage report:
```bash
./tests/run_tests.sh coverage
```

Or manually:
```bash
pytest tests/ --cov=lambda --cov-report=html --cov-report=term
```

View HTML coverage report:
```bash
open htmlcov/index.html  # On macOS
xdg-open htmlcov/index.html  # On Linux
```

## Test Architecture

### Mocking Strategy

The tests use `moto` to mock AWS services:

```python
@pytest.fixture(scope='function')
def dynamodb_mock(aws_credentials):
    """Create mock DynamoDB tables."""
    with mock_dynamodb():
        # Create tables with proper schema
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        # ... table creation
        yield dynamodb
```

**Benefits**:
- No AWS account required
- No costs incurred
- Fast execution
- Consistent test environment
- Complete isolation

### Fixtures

Common fixtures in `conftest.py`:

| Fixture | Purpose |
|---------|---------|
| `aws_credentials` | Mock AWS credentials |
| `dynamodb_mock` | Mock DynamoDB with tables |
| `s3_mock` | Mock S3 bucket |
| `test_user_id` | Sample user ID |
| `test_content_data` | Sample content data |
| `test_media_data` | Sample media data |
| `test_plugin_data` | Sample plugin data |
| `mock_context` | Mock Lambda context |

### Test Structure

Each test follows the Arrange-Act-Assert pattern:

```python
def test_create_content_success(self, dynamodb_mock, test_user_id, test_content_data):
    """Test successful content creation."""
    # Arrange
    content_repo = ContentRepository()
    content_item = {...}
    
    # Act
    result = content_repo.create(content_item)
    
    # Assert
    assert result['id'] == content_item['id']
    assert result['title'] == test_content_data['title']
```

## Writing New Tests

### Guidelines

1. **Use descriptive names**: `test_<action>_<expected_result>`
2. **Include docstrings**: Explain what the test validates
3. **Use fixtures**: Leverage existing fixtures for setup
4. **Test both paths**: Success and error cases
5. **Keep tests focused**: One concept per test
6. **Clean assertions**: Clear, specific assertions

### Example Template

```python
def test_new_feature(self, dynamodb_mock, test_user_id):
    """Test description of what this validates."""
    # Arrange - Set up test data
    repo = SomeRepository()
    test_data = {
        'field': 'value'
    }
    
    # Act - Perform the action
    result = repo.some_method(test_data)
    
    # Assert - Verify the results
    assert result is not None
    assert result['field'] == 'value'
```

### Adding New Test Files

1. Create file: `tests/test_<feature>_integration.py`
2. Import required modules
3. Create test class: `class Test<Feature>:`
4. Add test methods
5. Update markers in `pytest.ini` if needed
6. Document in README.md

## Continuous Integration

### GitHub Actions Example

```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: pip install -r tests/requirements.txt
      - name: Run tests
        run: pytest tests/ -v --cov=lambda
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

#### Import Errors
**Problem**: `ModuleNotFoundError: No module named 'lambda'`

**Solution**: Ensure lambda directory is in Python path:
```python
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
```

#### Mock Service Failures
**Problem**: Moto mocks not working

**Solutions**:
- Use `aws_credentials` fixture
- Check environment variables
- Verify moto version compatibility
- Ensure proper mock context managers

#### Test Failures
**Problem**: Tests fail unexpectedly

**Common causes**:
- Missing fixtures
- Incorrect table schema
- Timing issues with timestamps
- Environment variable conflicts

**Debug steps**:
1. Run with verbose output: `pytest -v`
2. Check fixture setup
3. Verify mock data
4. Review error messages carefully

### Performance Issues

If tests run slowly:
- Check for unnecessary sleeps
- Verify mock services are used (not real AWS)
- Reduce test data size
- Use function-scoped fixtures

## Best Practices

### Do's ✅
- Use fixtures for common setup
- Test edge cases and error conditions
- Keep tests independent
- Use meaningful assertions
- Document complex test scenarios
- Run tests before committing

### Don'ts ❌
- Don't use real AWS services in tests
- Don't share state between tests
- Don't test implementation details
- Don't skip error case testing
- Don't use hardcoded credentials
- Don't commit failing tests

## Test Metrics

### Current Coverage

Run coverage report to see current metrics:
```bash
pytest tests/ --cov=lambda --cov-report=term
```

### Target Metrics

- **Line Coverage**: > 80%
- **Branch Coverage**: > 70%
- **Test Execution Time**: < 60 seconds
- **Test Success Rate**: 100%

## Future Enhancements

Planned additions:
- [ ] End-to-end API tests with HTTP requests
- [ ] Performance benchmarking tests
- [ ] Load testing for concurrent operations
- [ ] Security testing for auth flows
- [ ] Contract testing for API endpoints
- [ ] Mutation testing for test quality

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Moto Documentation](http://docs.getmoto.org/)
- [AWS Boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
- [Testing Best Practices](https://docs.python-guide.org/writing/tests/)

## Support

For issues or questions:
1. Check this guide
2. Review test documentation in README.md
3. Check existing test examples
4. Review error messages carefully
5. Consult team documentation
