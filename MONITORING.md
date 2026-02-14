# Monitoring and Logging Guide

This document describes the monitoring and logging infrastructure for the Serverless CMS.

## CloudWatch Alarms

The system includes comprehensive CloudWatch alarms for all Lambda functions, API Gateway, and DynamoDB tables.

### Alarm Configuration

Alarms are automatically created during CDK deployment and send notifications to an SNS topic.

#### Setting Up Email Notifications

To receive alarm notifications via email, set the `ALARM_EMAIL` environment variable before deployment:

```bash
export ALARM_EMAIL="your-email@example.com"
cdk deploy
```

After deployment, you'll receive a confirmation email from AWS SNS. Click the confirmation link to start receiving alarm notifications.

### Lambda Function Alarms

For each Lambda function, the following alarms are created:

1. **Error Alarm**
   - Triggers when errors exceed 5 in a 5-minute period
   - Monitors function failures and exceptions
   - Threshold: 5 errors
   - Evaluation period: 1 x 5 minutes

2. **Duration Alarm**
   - Triggers when average execution time exceeds 80% of the function timeout
   - Helps identify performance degradation
   - Threshold: 80% of function timeout
   - Evaluation period: 2 x 5 minutes

3. **Throttle Alarm**
   - Triggers when function invocations are throttled
   - Indicates concurrency limits are being reached
   - Threshold: 1 throttle
   - Evaluation period: 1 x 5 minutes

### API Gateway Alarms

1. **4xx Error Alarm**
   - Triggers when client errors exceed 50 in a 5-minute period
   - Monitors validation errors, authentication failures, etc.
   - Threshold: 50 errors
   - Evaluation period: 1 x 5 minutes

2. **5xx Error Alarm**
   - Triggers when server errors exceed 10 in a 5-minute period
   - Monitors backend failures and integration errors
   - Threshold: 10 errors
   - Evaluation period: 1 x 5 minutes

3. **Latency Alarm**
   - Triggers when average latency exceeds 5 seconds
   - Monitors API performance
   - Threshold: 5000 milliseconds
   - Evaluation period: 2 x 5 minutes

### DynamoDB Alarms

For the content table (most critical):

1. **Read Throttle Alarm**
   - Triggers when read requests are throttled
   - Threshold: 5 throttles
   - Evaluation period: 1 x 5 minutes

2. **System Errors Alarm**
   - Triggers when DynamoDB system errors occur
   - Monitors GET_ITEM, PUT_ITEM, and QUERY operations
   - Threshold: 5 errors
   - Evaluation period: 1 x 5 minutes

## Structured Logging

All Lambda functions use structured JSON logging for consistent, searchable logs.

### Log Format

Logs are output in JSON format with the following structure:

```json
{
  "timestamp": 1234567890.123,
  "level": "INFO",
  "message": "Content created successfully",
  "environment": "prod",
  "request_id": "abc-123-def-456",
  "user_id": "user-123",
  "user_role": "author",
  "content_id": "content-456",
  "content_type": "post",
  "slug": "my-blog-post",
  "duration_ms": 245.67
}
```

### Log Levels

- **DEBUG**: Detailed diagnostic information
- **INFO**: General informational messages
- **WARNING**: Warning messages for potentially problematic situations
- **ERROR**: Error messages for failures
- **METRIC**: Custom performance metrics

### Using the Logger

The structured logger is available in the `shared.logger` module:

```python
from shared.logger import create_logger

def handler(event, context, user_id, role):
    # Create logger with context
    log = create_logger(event, context, user_id=user_id, user_role=role)
    
    # Log messages
    log.info('Processing request', operation='create_content')
    log.warning('Validation issue', field='slug')
    log.error('Operation failed', error='Database timeout')
    
    # Log custom metrics
    log.metric('content_create_duration', 245.67, 'Milliseconds',
              content_type='post')
```

### Performance Metrics

The logger automatically tracks and logs:

- **Request duration**: Total time to process a request
- **Database operation duration**: Time spent on DynamoDB operations
- **Plugin hook duration**: Time spent executing plugin hooks
- **Query duration**: Time spent on specific queries

### Searching Logs

Use CloudWatch Logs Insights to search and analyze logs:

#### Find all errors for a specific user:
```
fields @timestamp, message, error, error_type
| filter user_id = "user-123" and level = "ERROR"
| sort @timestamp desc
```

#### Find slow requests:
```
fields @timestamp, message, duration_ms, request_id
| filter duration_ms > 1000
| sort duration_ms desc
```

#### Aggregate metrics by content type:
```
fields content_type, duration_ms
| filter level = "METRIC" and metric_name = "content_create_duration"
| stats avg(duration_ms), max(duration_ms), count() by content_type
```

#### Find plugin failures:
```
fields @timestamp, message, hook, error
| filter level = "ERROR" and hook like /plugin/
| sort @timestamp desc
```

## CloudWatch Dashboards

You can create custom CloudWatch dashboards to visualize metrics:

1. Go to CloudWatch Console → Dashboards
2. Create a new dashboard
3. Add widgets for:
   - Lambda invocations and errors
   - API Gateway request count and latency
   - DynamoDB read/write capacity
   - Custom metrics from structured logs

## Log Retention

By default, CloudWatch Logs are retained indefinitely. To manage costs, consider setting a retention policy:

```typescript
// In CDK stack
import * as logs from 'aws-cdk-lib/aws-logs';

// Set log retention for Lambda functions
const contentCreateFunction = new lambda.Function(this, 'ContentCreateFunction', {
  // ... other config
  logRetention: logs.RetentionDays.ONE_MONTH,
});
```

## Best Practices

1. **Always include context**: Use the structured logger with request_id, user_id, and user_role
2. **Log at appropriate levels**: Use DEBUG for diagnostics, INFO for normal operations, ERROR for failures
3. **Include relevant data**: Add operation-specific fields to log entries
4. **Track performance**: Use log.metric() for custom performance metrics
5. **Avoid logging sensitive data**: Never log passwords, tokens, or PII
6. **Use structured fields**: Add data as separate fields rather than in the message string

## Troubleshooting

### High Error Rates

1. Check CloudWatch Logs for error details
2. Look for patterns in error_type and error messages
3. Check if errors are user-specific or system-wide
4. Review recent deployments or configuration changes

### Performance Issues

1. Query logs for high duration_ms values
2. Check which operations are slow (database, plugins, etc.)
3. Review DynamoDB metrics for throttling
4. Consider increasing Lambda memory or timeout

### Missing Logs

1. Verify Lambda functions have CloudWatch Logs permissions
2. Check log retention settings
3. Ensure LOG_LEVEL environment variable is set correctly

## Cost Optimization

- Set appropriate log retention periods
- Use log sampling for high-volume functions
- Archive old logs to S3 for long-term storage
- Use CloudWatch Logs Insights instead of exporting logs
