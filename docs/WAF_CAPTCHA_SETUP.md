# AWS WAF CAPTCHA Setup Guide

## Quick Setup (Recommended)

We've created an automated script to help you configure CAPTCHA:

```bash
# Run the setup script
./scripts/setup-captcha.sh dev
```

This script will:
1. ✓ Verify your WAF is deployed
2. ✓ Guide you through generating the CAPTCHA API key
3. ✓ Automatically update your frontend .env file
4. ✓ Show you the next steps

**Note**: AWS doesn't provide an API to generate CAPTCHA keys programmatically, so you'll need to manually generate it through the AWS Console (the script will guide you).

## Manual Setup

If you prefer to set up manually, follow these steps:

### 1. Deploy Infrastructure
```bash
npm run deploy:dev
```

This will create the WAF Web ACL and associate it with the API Gateway.

### 2. Obtain CAPTCHA API Key

1. Go to AWS Console → WAF & Shield
2. Select your region (same as API Gateway)
3. Click on Web ACLs
4. Find `cms-api-waf-{environment}`
5. Click on the "Application integration" tab
6. Under "CAPTCHA puzzle", click "Generate API key"
7. Copy the JavaScript API key URL (looks like: `https://[key].us-east-1.captcha-sdk.awswaf.com/[key]/jsapi.js`)

### 3. Update Frontend

Edit `frontend/public-website/src/components/CommentForm.tsx`:

```typescript
// Replace this line:
script.src = 'https://b82b1763d1f3.us-east-1.captcha-sdk.awswaf.com/b82b1763d1f3/jsapi.js';

// With your actual API key URL:
script.src = 'https://YOUR_ACTUAL_KEY.us-east-1.captcha-sdk.awswaf.com/YOUR_ACTUAL_KEY/jsapi.js';
```

Also update the API key in the renderCaptcha call:

```typescript
window.AwsWafCaptcha.renderCaptcha(captchaContainerRef.current, {
  apiKey: 'YOUR_ACTUAL_KEY', // Replace this
  onSuccess: (token: string) => {
    setCaptchaToken(token);
  },
  onError: (error: Error) => {
    console.error('CAPTCHA error:', error);
    setError('CAPTCHA verification failed. Please try again.');
  },
});
```

### 4. Rebuild and Deploy Frontend

```bash
cd frontend/public-website
npm run build
cd ../..
npm run deploy:frontend:dev
```

### 5. Enable CAPTCHA in Settings

1. Log in to admin panel
2. Go to Settings
3. Enable "CAPTCHA Protection"
4. Save settings

## Testing

### Test CAPTCHA Flow

1. Navigate to a blog post on the public website
2. Scroll to the comments section
3. Fill out the comment form
4. You should see a CAPTCHA challenge appear
5. Solve the CAPTCHA
6. Submit the comment
7. Verify the comment is created successfully

### Test CAPTCHA Immunity

1. Submit a comment and solve CAPTCHA
2. Within 5 minutes, submit another comment
3. You should NOT see a CAPTCHA challenge (immunity period)
4. After 5 minutes, submit another comment
5. CAPTCHA should appear again

### Test Rate Limiting Fallback

1. Disable CAPTCHA in settings
2. Submit 5 comments from the same IP
3. The 6th comment should be blocked with rate limit error
4. Wait 1 hour and try again

## Monitoring

### CloudWatch Metrics

Check these metrics in CloudWatch:

- `cms-rate-limit-{env}` - Number of requests blocked by rate limiting
- `cms-comment-captcha-{env}` - Number of CAPTCHA challenges issued
- `cms-aws-common-rules-{env}` - Requests blocked by common rules
- `cms-aws-bad-inputs-{env}` - Requests blocked by bad input rules

### WAF Dashboard

1. Go to AWS Console → WAF & Shield
2. Select your Web ACL
3. View the "Overview" tab for:
   - Request count
   - Blocked requests
   - CAPTCHA challenges
   - Rule metrics

## Troubleshooting

### CAPTCHA Widget Not Appearing

1. Check browser console for JavaScript errors
2. Verify the CAPTCHA SDK URL is correct
3. Ensure `captcha_enabled` is true in settings
4. Check that WAF is associated with API Gateway

### CAPTCHA Verification Failing

1. Check Lambda logs for `x-captcha-verified` header
2. Verify WAF rule is configured correctly
3. Ensure API Gateway stage matches WAF association
4. Check CloudWatch logs for WAF blocks

### Rate Limiting Too Aggressive

1. Adjust `RATE_LIMIT_MAX` in `lambda/comments/create.py`
2. Adjust `RATE_LIMIT_WINDOW` for different time periods
3. Redeploy Lambda function

### WAF Blocking Legitimate Requests

1. Check WAF logs for blocked requests
2. Review which rule is blocking
3. Add exclusions to managed rule sets if needed
4. Adjust rate limit threshold

## Configuration Options

### Rate Limiting

Edit `lambda/comments/create.py`:

```python
RATE_LIMIT_WINDOW = 3600  # 1 hour in seconds
RATE_LIMIT_MAX = 5        # Maximum comments per window
```

### CAPTCHA Immunity

Edit `lib/serverless-cms-stack.ts`:

```typescript
captchaConfig: {
  immunityTimeProperty: {
    immunityTime: 300, // 5 minutes (adjust as needed)
  },
},
```

### WAF Rate Limit

Edit `lib/serverless-cms-stack.ts`:

```typescript
rateBasedStatement: {
  limit: 2000, // Requests per 5 minutes per IP
  aggregateKeyType: 'IP',
},
```

## Security Best Practices

1. **Keep CAPTCHA API Key Private**: Don't commit it to version control
2. **Monitor WAF Metrics**: Set up CloudWatch alarms for unusual patterns
3. **Review Blocked Requests**: Regularly check for false positives
4. **Update Managed Rules**: AWS updates these automatically
5. **Test After Changes**: Always test CAPTCHA flow after infrastructure changes

## Cost Considerations

### WAF Pricing (as of 2024)
- Web ACL: $5.00/month
- Rules: $1.00/month per rule (4 rules = $4.00/month)
- Requests: $0.60 per million requests
- CAPTCHA: $0.40 per 1,000 CAPTCHA challenges

### Estimated Monthly Cost
- Low traffic (10K requests): ~$10/month
- Medium traffic (100K requests): ~$15/month
- High traffic (1M requests): ~$30/month

## Additional Resources

- [AWS WAF Documentation](https://docs.aws.amazon.com/waf/)
- [CAPTCHA Integration Guide](https://docs.aws.amazon.com/waf/latest/developerguide/waf-captcha.html)
- [WAF Managed Rules](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups.html)
- [CloudWatch Metrics for WAF](https://docs.aws.amazon.com/waf/latest/developerguide/monitoring-cloudwatch.html)
