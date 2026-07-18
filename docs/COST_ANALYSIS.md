# Serverless CMS - AWS Cost Analysis

## Current Infrastructure Costs (as of 2024)

### Monthly Fixed Costs

| Service | Component | Cost |
|---------|-----------|------|
| **AWS WAF** | Web ACL | $5.00 |
| **AWS WAF** | 4 Rules (rate limit, CAPTCHA, managed rules) | $4.00 |
| **CloudFront** | No fixed cost | $0.00 |
| **Cognito** | First 50,000 MAUs free | $0.00 |
| **SES** | First 62,000 emails/month free | $0.00 |
| **Total Fixed** | | **$9.00/month** |

### Variable Costs (Usage-Based)

#### Scenario 1: Small Blog (Low Traffic)
**Assumptions**: 10,000 page views/month, 50 comments, 5 new users

| Service | Usage | Cost |
|---------|-------|------|
| **Lambda** | 15,000 invocations, 512MB, 500ms avg | $0.30 |
| **API Gateway** | 15,000 requests | $0.02 |
| **DynamoDB** | 20,000 reads, 5,000 writes, 1GB storage | $1.50 |
| **S3** | 10GB storage, 50GB transfer | $0.50 |
| **CloudFront** | 50GB data transfer | $4.25 |
| **WAF** | 15,000 requests | $0.01 |
| **WAF CAPTCHA** | 50 challenges | $0.02 |
| **Cognito** | 5 MAUs (free tier) | $0.00 |
| **SES** | 100 emails (free tier) | $0.00 |
| **Total Variable** | | **$6.60** |
| **Total Monthly** | | **$15.60** |

#### Scenario 2: Medium Blog (Moderate Traffic)
**Assumptions**: 100,000 page views/month, 500 comments, 50 new users

| Service | Usage | Cost |
|---------|-------|------|
| **Lambda** | 150,000 invocations, 512MB, 500ms avg | $3.00 |
| **API Gateway** | 150,000 requests | $0.15 |
| **DynamoDB** | 200,000 reads, 50,000 writes, 5GB storage | $8.00 |
| **S3** | 50GB storage, 200GB transfer | $2.00 |
| **CloudFront** | 200GB data transfer | $17.00 |
| **WAF** | 150,000 requests | $0.09 |
| **WAF CAPTCHA** | 500 challenges | $0.20 |
| **Cognito** | 50 MAUs (free tier) | $0.00 |
| **SES** | 500 emails (free tier) | $0.00 |
| **Total Variable** | | **$30.44** |
| **Total Monthly** | | **$39.44** |

#### Scenario 3: Popular Blog (High Traffic)
**Assumptions**: 1,000,000 page views/month, 5,000 comments, 500 new users

| Service | Usage | Cost |
|---------|-------|------|
| **Lambda** | 1,500,000 invocations, 512MB, 500ms avg | $30.00 |
| **API Gateway** | 1,500,000 requests | $1.50 |
| **DynamoDB** | 2,000,000 reads, 500,000 writes, 20GB storage | $65.00 |
| **S3** | 200GB storage, 2TB transfer | $10.00 |
| **CloudFront** | 2TB data transfer | $170.00 |
| **WAF** | 1,500,000 requests | $0.90 |
| **WAF CAPTCHA** | 5,000 challenges | $2.00 |
| **Cognito** | 500 MAUs (free tier) | $0.00 |
| **SES** | 5,000 emails (free tier) | $0.00 |
| **Total Variable** | | **$279.40** |
| **Total Monthly** | | **$288.40** |

## Cost Optimization Options

### Option 1: Disable WAF/CAPTCHA (Save $9/month)
**Impact**: Rely on rate limiting only
- Remove WAF Web ACL
- Use Lambda-based rate limiting (5 comments/hour/IP)
- **Savings**: $9.00/month fixed cost
- **Risk**: Less protection against sophisticated attacks

**When to use**: Small personal blogs with low traffic

### Option 2: Use CloudFront Only (No WAF)
**Impact**: Basic DDoS protection via CloudFront
- Keep CloudFront for caching and DDoS protection
- Remove WAF for cost savings
- **Savings**: $9.00/month
- **Risk**: No CAPTCHA, no advanced bot protection

### Option 3: Optimize DynamoDB (Save 20-40%)
**Impact**: Use on-demand pricing for low traffic
- Switch from provisioned to on-demand capacity
- Enable DynamoDB auto-scaling
- **Savings**: 20-40% on DynamoDB costs
- **Best for**: Unpredictable traffic patterns

### Option 4: Optimize CloudFront (Save 15-30%)
**Impact**: Reduce data transfer costs
- Enable CloudFront compression
- Optimize image sizes
- Use CloudFront cache more aggressively
- **Savings**: 15-30% on CloudFront costs

### Option 5: Use S3 Intelligent-Tiering
**Impact**: Automatic cost optimization for storage
- Move infrequently accessed media to cheaper tiers
- **Savings**: 30-50% on S3 storage costs
- **Best for**: Large media libraries

## Cost Comparison: Serverless vs Traditional

### Traditional VPS Hosting (e.g., DigitalOcean, Linode)
| Component | Cost |
|-----------|------|
| VPS (2GB RAM, 50GB SSD) | $12-18/month |
| Managed Database | $15-25/month |
| CDN (optional) | $5-20/month |
| Backups | $2-5/month |
| **Total** | **$34-68/month** |

**Pros**: Predictable costs, full control
**Cons**: Manual scaling, maintenance overhead, single point of failure

### Serverless (Current Architecture)
| Traffic Level | Cost |
|---------------|------|
| Low (10K views) | $15.60/month |
| Medium (100K views) | $39.44/month |
| High (1M views) | $288.40/month |

**Pros**: Auto-scaling, no maintenance, pay-per-use, high availability
**Cons**: Costs scale with traffic, cold starts, vendor lock-in

## Free Tier Benefits (First 12 Months)

AWS Free Tier includes:
- **Lambda**: 1M requests/month, 400,000 GB-seconds compute
- **API Gateway**: 1M requests/month
- **DynamoDB**: 25GB storage, 25 read/write capacity units
- **S3**: 5GB storage, 20,000 GET requests, 2,000 PUT requests
- **CloudFront**: 50GB data transfer, 2M HTTP requests
- **Cognito**: 50,000 MAUs (always free)
- **SES**: 62,000 emails/month (always free when sending from EC2)

**Estimated First Year Savings**: $50-150/month depending on usage

## Cost Monitoring & Alerts

### Set Up AWS Budgets
```bash
# Create a budget alert
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

### Recommended Alerts
1. **Monthly Budget Alert**: $50/month threshold
2. **WAF Cost Alert**: $15/month threshold
3. **DynamoDB Cost Alert**: $20/month threshold
4. **CloudFront Cost Alert**: $30/month threshold

### Cost Monitoring Tools
- **AWS Cost Explorer**: Analyze spending patterns
- **AWS Budgets**: Set custom cost alerts
- **CloudWatch Metrics**: Monitor resource usage
- **Third-party**: CloudHealth, CloudCheckr, Datadog

## Recommendations by Use Case

### Personal Blog (< 10K views/month)
**Recommended**: Disable WAF, use rate limiting only
- **Estimated Cost**: $6-10/month
- **Setup**: Set `captcha_enabled: false` in settings

### Small Business Blog (10K-100K views/month)
**Recommended**: Keep current setup with WAF
- **Estimated Cost**: $15-40/month
- **Setup**: Current configuration is optimal

### High-Traffic Blog (> 100K views/month)
**Recommended**: Enable all optimizations
- **Estimated Cost**: $40-300/month
- **Setup**: 
  - Enable CloudFront compression
  - Use DynamoDB auto-scaling
  - Implement S3 Intelligent-Tiering
  - Consider Reserved Capacity for predictable workloads

### E-commerce/Critical Site
**Recommended**: Keep WAF + add Shield Standard (free)
- **Estimated Cost**: $15-300/month + Shield Advanced ($3,000/month if needed)
- **Setup**: Current configuration + AWS Shield

## Cost Reduction Checklist

- [ ] Review CloudWatch logs retention (reduce from 30 to 7 days)
- [ ] Enable S3 lifecycle policies for old media
- [ ] Implement CloudFront cache optimization
- [ ] Use DynamoDB on-demand for low traffic
- [ ] Compress images before upload
- [ ] Enable CloudFront compression
- [ ] Review and remove unused Lambda functions
- [ ] Optimize Lambda memory allocation
- [ ] Use Lambda reserved concurrency for predictable workloads
- [ ] Consider disabling WAF for development environments

## Summary

**AWS WAF CAPTCHA API Key Limitation**: 5 domains maximum per key

**Recommended Setup**:
- Production: Enable CAPTCHA with your main domains (yourdomain.com, www.yourdomain.com)
- Development/Staging: Disable CAPTCHA, use rate limiting only
- Cost: $9/month for production only

**If you need more than 5 domains**: Create separate Web ACLs ($9/month each) or prioritize which domains get CAPTCHA protection.

See `CAPTCHA_DOMAIN_MANAGEMENT.md` for detailed strategies and examples.

**Key Cost Drivers**:
1. **CloudFront** (30-60% of variable costs) - Scales with traffic
2. **DynamoDB** (20-30% of variable costs) - Scales with data operations
3. **Lambda** (10-15% of variable costs) - Scales with requests
4. **WAF** ($9/month fixed) - Optional, can be disabled

**Bottom Line**: 
- For small blogs: **~$15-20/month** (competitive with VPS)
- For medium blogs: **~$40/month** (better value than VPS)
- For high-traffic: **~$300/month** (much cheaper than equivalent VPS cluster)

The serverless architecture provides excellent value for money, especially as traffic grows, with automatic scaling and no maintenance overhead.
