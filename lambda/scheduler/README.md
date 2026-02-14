# Scheduler Lambda Functions

This directory contains Lambda functions that are triggered by EventBridge rules for scheduled tasks.

## Functions

### publish_scheduled.py

**Purpose:** Publishes content that has reached its scheduled publication time.

**Trigger:** EventBridge rule (every 5 minutes)

**Requirements:**
- 15.1: Check for scheduled content
- 15.2: Update content status to published when time is reached
- 15.3: Triggered every 5 minutes
- 15.4: Set published_at timestamp

**Environment Variables:**
- `CONTENT_TABLE`: DynamoDB table name for content
- `ENVIRONMENT`: Deployment environment (dev/staging/prod)

**Functionality:**
1. Queries DynamoDB using the `status-scheduled_at-index` GSI
2. Finds all content with status='draft' and scheduled_at <= current_time
3. Updates each item to status='published' and sets published_at timestamp
4. Logs success/failure for each item
5. Returns summary of published items

**Error Handling:**
- Individual item failures are logged but don't stop processing of other items
- Returns list of failed items in response for monitoring
- Continues processing even if some items fail

**Monitoring:**
- CloudWatch Logs: All operations are logged
- CloudWatch Metrics: Lambda duration, errors, invocations
- Return value includes counts for monitoring dashboards
