# CAPTCHA Setup Summary

## Can CAPTCHA be set up programmatically?

**Short answer**: Partially, but not fully automated.

### What CDK Does Automatically ✓

Your CDK stack (`lib/serverless-cms-stack.ts`) already creates:
- ✓ AWS WAF Web ACL
- ✓ CAPTCHA rules and configuration
- ✓ Rate limiting rules
- ✓ Managed rule groups (AWS Common Rules, Bad Inputs)
- ✓ Association with API Gateway
- ✓ CloudWatch metrics and logging

**This is all deployed when you run**: `npm run deploy:dev`

### What Requires Manual Steps ✗

AWS does **not** provide an API to:
- Generate CAPTCHA API keys programmatically
- Retrieve existing CAPTCHA API keys via CLI/SDK

This is a security design decision by AWS - CAPTCHA keys must be manually generated through the AWS Console.

## Why This Limitation Exists

AWS WAF CAPTCHA keys are tied to:
1. Your specific Web ACL
2. Your AWS account
3. Domain restrictions (optional)

AWS requires manual generation to ensure:
- You understand what you're enabling
- You have proper access to the AWS Console
- Keys aren't accidentally exposed in automation scripts

## The Solution: Semi-Automated Setup

We've created a helper script that automates everything possible:

```bash
./scripts/setup-captcha.sh dev
```

### What the Script Does:

1. **Automated**:
   - ✓ Verifies your WAF deployment
   - ✓ Retrieves Web ACL information
   - ✓ Provides direct AWS Console link
   - ✓ Updates your `.env` file automatically
   - ✓ Shows next steps

2. **Manual** (guided by script):
   - You click the AWS Console link
   - You click "Generate API key" button
   - You copy/paste the key into the script
   - Done!

**Time required**: ~2 minutes

## Step-by-Step Process

### 1. Deploy Infrastructure (Automated)
```bash
npm run deploy:dev
```
This creates the WAF Web ACL with CAPTCHA enabled.

### 2. Generate CAPTCHA Key (Manual - 1 minute)
```bash
./scripts/setup-captcha.sh dev
```
Follow the prompts to generate and configure the key.

### 3. Deploy Frontend (Automated)
```bash
cd frontend/public-website
npm run build
cd ../..
npm run deploy:frontend:dev
```

### 4. Enable in Settings (Manual - 30 seconds)
- Log in to admin panel
- Settings → Enable "CAPTCHA Protection"
- Save

**Total time**: ~5 minutes

## Alternative: Skip CAPTCHA Entirely

If you want to avoid the manual step and save $9/month:

1. **Don't run the CAPTCHA setup script**
2. **In admin settings**: Keep "CAPTCHA Protection" disabled
3. **Rate limiting** (5 comments/hour/IP) will still protect against spam

You can always enable CAPTCHA later if needed.

## Comparison with Other Services

### Google reCAPTCHA
- **Setup**: Fully automated via API
- **Cost**: Free (but Google tracks users)
- **Privacy**: Google collects user data

### hCaptcha
- **Setup**: Fully automated via API
- **Cost**: Free tier available
- **Privacy**: Better than Google

### AWS WAF CAPTCHA
- **Setup**: Semi-automated (key generation manual)
- **Cost**: $9/month + usage
- **Privacy**: No third-party tracking
- **Integration**: Native AWS integration

## Recommendation

For your use case:

### If you want the easiest setup:
**Disable CAPTCHA** and use rate limiting only
- Cost: $0 extra
- Setup time: 0 minutes
- Protection: Good for small-medium blogs

### If you want best protection:
**Use AWS WAF CAPTCHA** (current setup)
- Cost: $9/month + usage
- Setup time: 5 minutes (one-time)
- Protection: Excellent, no third-party tracking

### If you want free CAPTCHA:
**Switch to hCaptcha or reCAPTCHA**
- Cost: $0
- Setup time: 15-30 minutes (code changes needed)
- Protection: Good, but third-party tracking

## Current Status

Your infrastructure is **ready for CAPTCHA**:
- ✓ WAF Web ACL deployed
- ✓ CAPTCHA rules configured
- ✓ Frontend code supports CAPTCHA
- ✓ Setup script ready to use

**Next step**: Run `./scripts/setup-captcha.sh dev` when you're ready to enable it.

Or, simply leave CAPTCHA disabled and rely on rate limiting - it's already working!
