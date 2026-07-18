# AWS WAF CAPTCHA Domain Management

## The 5-Domain Limit

AWS WAF CAPTCHA API keys are limited to **5 domains per key**. This is important to plan for if you're managing multiple sites or environments.

## Domain Counting

Each of these counts as a separate domain:
- ✓ `example.com`
- ✓ `www.example.com`
- ✓ `blog.example.com`
- ✓ `staging.example.com`
- ✓ `dev.example.com`

**Total: 5 domains = 1 API key fully used**

## Strategies for Managing Multiple Environments

### Strategy 1: Use Subdomains Wisely (Recommended)

**Best for**: Single production site with dev/staging

Configure your domains:
1. `yourdomain.com` (production)
2. `www.yourdomain.com` (production www)
3. `staging.yourdomain.com` (staging)
4. `dev.yourdomain.com` (development)
5. *(1 slot remaining for future use)*

**Pros**: 
- Single API key for all environments
- Simple management
- Cost: $9/month total

**Cons**: 
- Limited to 5 total domains
- All environments share same WAF Web ACL

### Strategy 2: Separate API Keys per Environment

**Best for**: Multiple production sites or strict environment isolation

Create separate Web ACLs and API keys:

**Development Environment**:
- Web ACL: `cms-api-waf-dev`
- API Key: `dev-key-123`
- Domains: `dev.yourdomain.com`, `localhost:3000` (for local testing)

**Staging Environment**:
- Web ACL: `cms-api-waf-staging`
- API Key: `staging-key-456`
- Domains: `staging.yourdomain.com`

**Production Environment**:
- Web ACL: `cms-api-waf-prod`
- API Key: `prod-key-789`
- Domains: `yourdomain.com`, `www.yourdomain.com`

**Pros**:
- Complete isolation between environments
- Each environment has 5 domains available
- Better security (prod key can't be used in dev)

**Cons**:
- Cost: $9/month × 3 = $27/month
- More complex management
- Need to manage 3 separate API keys

### Strategy 3: Disable CAPTCHA in Non-Production

**Best for**: Cost-conscious deployments

**Production**:
- Enable CAPTCHA with API key
- Domains: `yourdomain.com`, `www.yourdomain.com`
- Cost: $9/month

**Development/Staging**:
- Disable CAPTCHA (set `captcha_enabled: false`)
- Use rate limiting only
- Cost: $0

**Pros**:
- Lowest cost ($9/month)
- Simple management
- Rate limiting still protects dev/staging

**Cons**:
- Can't test CAPTCHA in non-prod environments
- Different behavior between environments

### Strategy 4: Use Wildcard Domains (If Supported)

**Note**: AWS WAF CAPTCHA does NOT support wildcard domains like `*.yourdomain.com`

You must list each subdomain explicitly.

## Recommended Setup by Use Case

### Single Site (Most Common)

```
Production:
- yourdomain.com
- www.yourdomain.com

Staging (optional):
- staging.yourdomain.com

Development:
- CAPTCHA disabled (use rate limiting)
```

**Cost**: $9/month
**API Keys**: 1

### Multiple Sites (Agency/SaaS)

**Option A: Separate Web ACLs per Client**
```
Client 1: cms-api-waf-client1 ($9/month)
- client1.com
- www.client1.com

Client 2: cms-api-waf-client2 ($9/month)
- client2.com
- www.client2.com
```

**Option B: Shared Web ACL (if under 5 domains total)**
```
Shared: cms-api-waf-shared ($9/month)
- client1.com
- www.client1.com
- client2.com
- www.client2.com
- client3.com (5th domain)
```

### Development Team

```
Production: cms-api-waf-prod ($9/month)
- yourdomain.com
- www.yourdomain.com

Dev/Staging: CAPTCHA disabled ($0)
- Use rate limiting
- Test CAPTCHA in production-like staging if needed
```

## How to Configure Domains

### When Generating API Key

1. Go to AWS Console → WAF & Shield
2. Select your Web ACL
3. Go to "Application integration" tab
4. Click "Generate API key"
5. **Add your domains** in the "Allowed domains" section:
   ```
   yourdomain.com
   www.yourdomain.com
   staging.yourdomain.com
   ```
6. Copy the API key

### Adding Domains Later

1. Go to AWS Console → WAF & Shield
2. Select your Web ACL
3. Go to "Application integration" tab
4. Find your API key
5. Click "Edit"
6. Add/remove domains (max 5 total)
7. Save

**Note**: Changes take effect immediately, no redeployment needed.

## Testing Locally

For local development (`localhost:3000`):

**Option 1: Add localhost to API key**
```
Domains:
- yourdomain.com
- www.yourdomain.com
- localhost:3000
```

**Option 2: Disable CAPTCHA locally**
```bash
# In frontend/public-website/.env.local
VITE_CAPTCHA_API_KEY=
VITE_CAPTCHA_SCRIPT_URL=
```

Then in admin settings, disable CAPTCHA for local testing.

## Cost Optimization

### If You Need More Than 5 Domains

**Scenario**: You have 8 domains to protect

**Option 1: Multiple API Keys** ($18/month)
- Web ACL 1: 5 domains ($9/month)
- Web ACL 2: 3 domains ($9/month)

**Option 2: Prioritize** ($9/month)
- Enable CAPTCHA on 5 most important domains
- Use rate limiting only on remaining 3 domains

**Option 3: Consolidate** ($9/month)
- Use fewer subdomains
- Example: Only `yourdomain.com` (no www)
- Redirect www → apex domain

## Current Setup Recommendation

For your serverless CMS, I recommend:

```
Production Web ACL (cms-api-waf-prod):
- yourdomain.com
- www.yourdomain.com
- (3 slots available for future domains)

Development/Staging:
- CAPTCHA disabled
- Rate limiting only
```

**Cost**: $9/month
**Flexibility**: 3 additional domains available
**Simplicity**: Single API key to manage

## Updating the Setup Script

The setup script will prompt you for domains when configuring CAPTCHA. You can add up to 5 domains during setup.

## Summary

- ✓ Each API key supports **5 domains maximum**
- ✓ Subdomains count as separate domains
- ✓ No wildcard support
- ✓ Can create multiple Web ACLs for more domains ($9/month each)
- ✓ Recommended: Use 1 API key for production, disable CAPTCHA in dev/staging

**Bottom line**: For most single-site deployments, 5 domains is plenty. Plan your domain structure accordingly!
