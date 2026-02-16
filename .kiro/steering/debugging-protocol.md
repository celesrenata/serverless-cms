# Debugging Protocol

## Critical Rules

1. **NEVER ask the user to check browser dev tools, network tabs, or console logs**
   - The user will provide error information when relevant
   - Do not request screenshots, network payloads, or console output
   - Work with the information provided

2. **When the user reports a bug:**
   - Check the code immediately
   - Check CloudWatch logs if needed
   - Check DynamoDB data if needed
   - Fix the issue directly

3. **Do not explain what "should" happen**
   - The user is reporting what IS happening
   - Believe the user's report
   - Find and fix the root cause

4. **Do not repeat the same explanations**
   - If a fix didn't work, try a different approach
   - Don't keep saying "wait for deployment"
   - Check if there are other related issues

5. **Be direct and action-oriented**
   - Make the fix
   - Test it
   - Deploy it
   - Move on

## Deployment Awareness

- GitHub Actions deploys automatically on push to develop
- Deployment takes 5-10 minutes
- Don't repeatedly tell the user to wait
- If multiple fixes are needed, batch them together
