# CloudFront Distribution Setup

This document describes the CloudFront distribution configuration for the Serverless CMS.

## Overview

Two CloudFront distributions have been configured:
1. **Admin Distribution** - Serves the admin panel React application
2. **Public Distribution** - Serves the public website React application

Both distributions include:
- S3 origins for static assets (HTML, CSS, JS, images)
- API Gateway origin for `/api/*` endpoints
- HTTPS redirect enforcement
- Security headers
- Error page handling for SPA routing

## Features Implemented

### Cache Policies

1. **Static Assets Cache Policy**
   - Long TTL (7 days default, 365 days max)
   - Gzip and Brotli compression enabled
   - No query string or cookie forwarding
   - Used for: HTML, CSS, JS, images from S3

2. **API Cache Policy**
   - No caching (0 TTL)
   - All headers, cookies, and query strings forwarded
   - Used for: `/api/*` endpoints

### Security Headers

- Content-Type-Options: nosniff
- Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security: max-age=31536000; includeSubDomains
- X-XSS-Protection: 1; mode=block
- CORS headers for cross-origin requests

### Error Handling

Both distributions handle 403 and 404 errors by serving `/index.html` to support client-side routing in React SPAs.

## Custom Domain Configuration (Optional)

If you provide a `domainName` parameter when deploying the stack, the following will be configured:

1. **ACM Certificate**
   - Domain: `example.com`
   - Subject Alternative Names: `*.example.com`
   - DNS validation via Route53

2. **CloudFront Domain Names**
   - Admin: `admin.example.com`
   - Public: `example.com` and `www.example.com`

3. **Route53 DNS Records**
   - A record for `admin.example.com` → Admin CloudFront distribution
   - A record for `example.com` → Public CloudFront distribution
   - A record for `www.example.com` → Public CloudFront distribution

## Deployment

### Without Custom Domain

```bash
cdk deploy --context environment=dev
```

### With Custom Domain

```bash
cdk deploy --context environment=prod --context domainName=example.com
```

**Note:** The Route53 hosted zone for your domain must already exist in your AWS account.

## Outputs

After deployment, the following outputs will be available:

- `AdminDistributionId` - CloudFront distribution ID for admin panel
- `AdminDistributionDomainName` - CloudFront domain for admin panel
- `AdminUrl` - Full HTTPS URL for admin panel
- `PublicDistributionId` - CloudFront distribution ID for public website
- `PublicDistributionDomainName` - CloudFront domain for public website
- `PublicUrl` - Full HTTPS URL for public website

If custom domain is configured:
- `DomainName` - Custom domain name
- `AdminCustomUrl` - Custom domain URL for admin panel
- `PublicCustomUrl` - Custom domain URL for public website
- `CertificateArn` - ACM certificate ARN
- `HostedZoneId` - Route53 hosted zone ID

## Frontend Configuration

Update your frontend applications to use the CloudFront URLs:

### Admin Panel (.env)
```
VITE_API_URL=https://<AdminDistributionDomainName>/api/v1
```

### Public Website (.env)
```
VITE_API_URL=https://<PublicDistributionDomainName>/api/v1
```

## Cache Invalidation

After deploying new frontend code, invalidate the CloudFront cache:

```bash
# Admin distribution
aws cloudfront create-invalidation \
  --distribution-id <AdminDistributionId> \
  --paths "/*"

# Public distribution
aws cloudfront create-invalidation \
  --distribution-id <PublicDistributionId> \
  --paths "/*"
```

## Performance Considerations

- **Price Class**: Set to `PRICE_CLASS_100` (North America and Europe only) for cost optimization
- **HTTP Version**: HTTP/2 and HTTP/3 enabled for better performance
- **Compression**: Gzip and Brotli enabled for static assets
- **TLS**: Minimum TLS 1.2 enforced

## Security Considerations

- Origin Access Identity (OAI) restricts S3 bucket access to CloudFront only
- HTTPS redirect enforced on all requests
- Security headers prevent common web vulnerabilities
- API endpoints require proper authentication headers
