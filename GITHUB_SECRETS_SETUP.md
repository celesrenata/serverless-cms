# GitHub Secrets Setup Guide

This guide explains how to configure GitHub Secrets for automated deployments.

## Required Secrets

### AWS Credentials for Development and Staging
- `AWS_ACCESS_KEY_ID` - Your AWS access key (used for dev and staging)
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key (used for dev and staging)

### AWS Credentials for Production
- `AWS_ACCESS_KEY_ID_PROD` - Your AWS access key for production
- `AWS_SECRET_ACCESS_KEY_PROD` - Your AWS secret key for production

**Note**: Production uses separate credentials for security isolation. This allows you to use different AWS accounts or more restricted IAM permissions for production deployments.

### CAPTCHA Configuration (New - Optional)
- `CAPTCHA_SCRIPT_URL` - AWS WAF CAPTCHA JavaScript SDK URL
- `CAPTCHA_API_KEY` - AWS WAF CAPTCHA API key

## How to Add GitHub Secrets

### Step 1: Navigate to Repository Settings

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/serverless-cms`
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add CAPTCHA Secrets

Click **New repository secret** for each of the following:

#### CAPTCHA_SCRIPT_URL

- **Name**: `CAPTCHA_SCRIPT_URL`
- **Value**: `https://b82b1763d1f3.us-west-2.captcha-sdk.awswaf.com/b82b1763d1f3/jsapi.js`
- Click **Add secret**

#### CAPTCHA_API_KEY

- **Name**: `CAPTCHA_API_KEY`
- **Value**: 
```
xV1zcgW8NBCGqYNVichFiF40/UwCWkWk2CASo7BvYhSh7ynEHXKsyU8H+PA1G6w24YY/+iw27Nyx4aezGMeGp7KUjrX1bbYbQ70hFM8qyLu5MO2N25WA7k4RqJcDS+x0NSbApYTEe1b0FbXIiByki0KTtaNmwv1VBQHii4j/2N3UB3y4IVhXi2Z9FgVqX2Di/VFYKaYrNrmDL2Vf+brjvPK2Hsey5DPFRL5KriarodRzL8kq3TuE+j6EsltRBlkENwzQT+XZX0Hhp0gng0bCFFC0mpYk8ScxDL8q1rldanbpF0v0+KhQ3U/ZlEzI68Qj0+sXPtaQDnir4Booib+OMF0LSGvnFyG8a77pN3xPzfdRJrAgV00He+iv25Vu/h35RQIozfpahZa4gulaZF8Pb3Gev4tTFrWZsZiO8gt3a62voOz3rx9oFuAnNVbMhLjdi1tSuT8LDXISgb9jRZHAvp7TVeZg62urxhuYw/0x6sm3OldcBz7j2c0/1qb8ybTw3aygkT2PZ1h7C+OdUo0Zef1b6M03/J6izDz/K47q3ls5rMkzm3iGfTvlaaCKHFFmwz4iyJN8Aq5nPnEVg7QaEwe2mu+svOI6gOUb/d12J+JWmghXAnq0XU6ILWCfgztVRSJjEzNTQnrm7Yo1wHQnLnkrgA4fr9io05+/h+HEqP0=_1_1
```
- Click **Add secret**

### Step 3: Verify Secrets

After adding the secrets, you should see them listed (values will be hidden):

- ✓ AWS_ACCESS_KEY_ID (for dev/staging)
- ✓ AWS_SECRET_ACCESS_KEY (for dev/staging)
- ✓ AWS_ACCESS_KEY_ID_PROD (for production)
- ✓ AWS_SECRET_ACCESS_KEY_PROD (for production)
- ✓ CAPTCHA_SCRIPT_URL
- ✓ CAPTCHA_API_KEY

## How It Works

### Automated Deployment Flow

When you push code to the `develop`, `staging`, or `main` branch:

1. **GitHub Actions triggers** the CI/CD workflow
2. **Tests run** (backend, frontend, infrastructure)
3. **CDK deploys** infrastructure to AWS
4. **Frontend config is generated** with secrets injected:
   ```bash
   # The generate-frontend-config.sh script receives:
   CAPTCHA_SCRIPT_URL=${{ secrets.CAPTCHA_SCRIPT_URL }}
   CAPTCHA_API_KEY=${{ secrets.CAPTCHA_API_KEY }}
   
   # And creates frontend/public-website/.env with:
   VITE_CAPTCHA_SCRIPT_URL=https://...
   VITE_CAPTCHA_API_KEY=xV1zcgW8...
   ```
5. **Frontend builds** with environment variables baked in
6. **Frontend deploys** to S3 and CloudFront

### Local Development

For local development, you still use your local `.env` file:

```bash
# frontend/public-website/.env (not committed to Git)
VITE_API_ENDPOINT=https://...
VITE_ENVIRONMENT=dev
VITE_CAPTCHA_SCRIPT_URL=https://b82b1763d1f3.us-west-2.captcha-sdk.awswaf.com/b82b1763d1f3/jsapi.js
VITE_CAPTCHA_API_KEY=xV1zcgW8NBCGqYNVichFiF40/UwCWkWk2CASo7BvYhSh7ynEHXKsyU8H+PA1G6w24YY/+iw27Nyx4aezGMeGp7KUjrX1bbYbQ70hFM8qyLu5MO2N25WA7k4RqJcDS+x0NSbApYTEe1b0FbXIiByki0KTtaNmwv1VBQHii4j/2N3UB3y4IVhXi2Z9FgVqX2Di/VFYKaYrNrmDL2Vf+brjvPK2Hsey5DPFRL5KriarodRzL8kq3TuE+j6EsltRBlkENwzQT+XZX0Hhp0gng0bCFFC0mpYk8ScxDL8q1rldanbpF0v0+KhQ3U/ZlEzI68Qj0+sXPtaQDnir4Booib+OMF0LSGvnFyG8a77pN3xPzfdRJrAgV00He+iv25Vu/h35RQIozfpahZa4gulaZF8Pb3Gev4tTFrWZsZiO8gt3a62voOz3rx9oFuAnNVbMhLjdi1tSuT8LDXISgb9jRZHAvp7TVeZg62urxhuYw/0x6sm3OldcBz7j2c0/1qb8ybTw3aygkT2PZ1h7C+OdUo0Zef1b6M03/J6izDz/K47q3ls5rMkzm3iGfTvlaaCKHFFmwz4iyJN8Aq5nPnEVg7QaEwe2mu+svOI6gOUb/d12J+JWmghXAnq0XU6ILWCfgztVRSJjEzNTQnrm7Yo1wHQnLnkrgA4fr9io05+/h+HEqP0=_1_1
```

## Disabling CAPTCHA

If you want to disable CAPTCHA:

### Option 1: Remove GitHub Secrets
Delete the `CAPTCHA_SCRIPT_URL` and `CAPTCHA_API_KEY` secrets from GitHub. The frontend will build without CAPTCHA configuration.

### Option 2: Disable in Admin Settings
Keep the secrets but disable CAPTCHA in the admin panel:
1. Log in to admin panel
2. Go to Settings
3. Set "CAPTCHA Protection" to disabled
4. Save

## Updating CAPTCHA Keys

If you need to regenerate your CAPTCHA API key:

1. Go to AWS Console → WAF & Shield → Your Web ACL → Application Integration
2. Delete the old API key
3. Generate a new API key
4. Update the GitHub secrets with new values:
   - Go to repository Settings → Secrets and variables → Actions
   - Click on each secret and update the value
5. Re-run the GitHub Actions workflow or push new code

## Troubleshooting

### CAPTCHA Not Working After Deployment

**Symptom**: Console error "CAPTCHA is enabled but VITE_CAPTCHA_SCRIPT_URL is not configured"

**Solution**: 
1. Verify secrets are added to GitHub (Settings → Secrets and variables → Actions)
2. Check the GitHub Actions workflow log to see if secrets were injected
3. Re-run the workflow: Actions tab → Select latest workflow → Re-run jobs

### Secrets Not Being Injected

**Symptom**: Frontend builds but CAPTCHA variables are missing

**Possible causes**:
1. Secrets not added to GitHub repository
2. Secret names don't match exactly (case-sensitive)
3. Workflow file not updated (check `.github/workflows/ci-cd.yml`)

**Solution**:
1. Verify secret names match exactly: `CAPTCHA_SCRIPT_URL` and `CAPTCHA_API_KEY`
2. Check workflow file has the `env:` section in the "Generate Frontend Configuration" step
3. Push a new commit to trigger the workflow again

### Local Development Works But Deployed Site Doesn't

**Symptom**: CAPTCHA works locally but not on deployed site

**Possible causes**:
1. GitHub Secrets not configured
2. Domain not added to CAPTCHA API key whitelist

**Solution**:
1. Add GitHub Secrets as described above
2. Verify your domain is in the CAPTCHA API key's allowed domains list (AWS Console)

## Security Notes

### Why GitHub Secrets for CAPTCHA?

Even though CAPTCHA API keys are "public" (they're in the frontend JavaScript), using GitHub Secrets provides:

1. **Centralized management** - Update once, applies to all environments
2. **Audit trail** - GitHub logs when secrets are accessed
3. **Best practice** - Keeps sensitive values out of Git history
4. **Flexibility** - Easy to rotate keys without code changes

### What About .env Files?

The `.env` files are in `.gitignore` for good reason:
- Prevents accidental commit of sensitive values
- Allows different developers to have different local configs
- Keeps Git history clean

GitHub Secrets + automated config generation gives you the best of both worlds: security and automation.

## Summary

✅ Add `CAPTCHA_SCRIPT_URL` and `CAPTCHA_API_KEY` to GitHub Secrets
✅ Push code to trigger automated deployment
✅ GitHub Actions injects secrets during build
✅ Frontend deploys with CAPTCHA configured
✅ Local `.env` file stays in `.gitignore`

**Next step**: Add the secrets to GitHub, then push your code changes!
