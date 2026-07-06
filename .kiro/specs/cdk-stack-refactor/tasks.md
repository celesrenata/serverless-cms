# Implementation Plan: CDK Stack Refactor

## Overview

Decompose the monolithic `lib/serverless-cms-stack.ts` (2340 lines) into 8 modular constructs under `lib/constructs/`, preserving all CloudFormation logical IDs for zero-downtime deployment. Uses a Lambda factory pattern and typed props interfaces.

## Tasks

- [x] 1. Capture logical IDs from current monolith
  - [x] 1.1 Run `cdk synth` on the current monolith and save the CloudFormation template JSON
    - Execute `npx cdk synth --context environment=dev --no-staging > /tmp/monolith-template.json`
    - This captures all current logical IDs that must be preserved
    - _Requirements: 2.1, 2.2_
  - [x] 1.2 Create `lib/utils/logical-id.ts` with the `preserveLogicalId` helper function
    - Implement the utility that calls `overrideLogicalId` on a resource's CfnResource node
    - _Requirements: 2.1_

- [x] 2. Create constructs directory and barrel export
  - [x] 2.1 Create `lib/constructs/index.ts` barrel file
    - Create the directory structure and initial barrel file (will be updated as constructs are added)
    - _Requirements: 4.1, 4.4_

- [x] 3. Implement DatabaseConstruct
  - [x] 3.1 Create `lib/constructs/database.ts` with DatabaseConstructProps interface and DatabaseConstruct class
    - Move all 6 DynamoDB table definitions (content, media, users, settings, plugins, comments)
    - Move all GSI definitions (slug-index, type-published_at-index, status-published_at-index, email-index, content_id-created_at-index, status-created_at-index)
    - Apply `preserveLogicalId` to each table and GSI using IDs from the captured template
    - Expose all tables as public readonly properties
    - _Requirements: 1.1, 2.1, 4.1, 4.3, 5.1_
  - [x] 3.2 Update barrel export to include DatabaseConstruct
    - _Requirements: 4.4_

- [x] 4. Implement StorageConstruct
  - [x] 4.1 Create `lib/constructs/storage.ts` with StorageConstructProps interface and StorageConstruct class
    - Move mediaBucket, adminBucket, publicBucket definitions with all CORS, versioning, and access settings
    - Apply `preserveLogicalId` to each bucket
    - Expose all buckets as public readonly properties
    - _Requirements: 1.1, 2.1, 4.1, 4.3, 5.2_
  - [x] 4.2 Update barrel export to include StorageConstruct
    - _Requirements: 4.4_

- [x] 5. Implement AuthConstruct
  - [x] 5.1 Create `lib/constructs/auth.ts` with AuthConstructProps interface and AuthConstruct class
    - Move UserPool and UserPoolClient definitions with all password policies, attributes, and token settings
    - Apply `preserveLogicalId` to user pool and client
    - Expose userPool and userPoolClient as public readonly properties
    - _Requirements: 1.1, 2.1, 4.1, 4.3, 5.3_
  - [x] 5.2 Update barrel export to include AuthConstruct
    - _Requirements: 4.4_

- [x] 6. Implement EmailConstruct
  - [x] 6.1 Create `lib/constructs/email.ts` with EmailConstructProps interface and EmailConstruct class
    - Move SES email identity, configuration set, event destinations
    - Move bounce and complaint SNS topics with conditional email subscriptions
    - Apply `preserveLogicalId` to all resources
    - Expose sesFromEmail, sesConfigurationSetName, sesBouncesTopic, sesComplaintsTopic
    - _Requirements: 1.1, 2.1, 4.1, 4.3, 5.6_
  - [x] 6.2 Update barrel export to include EmailConstruct
    - _Requirements: 4.4_

- [x] 7. Checkpoint - Verify foundational constructs
  - Ensure `npm run build` compiles without errors. Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement CdnConstruct
  - [x] 8.1 Create `lib/constructs/cdn.ts` with CdnConstructProps interface and CdnConstruct class
    - Move 3 OAIs (admin, public, media) with S3 bucket grants
    - Move cache policies (staticAssetsCachePolicy, apiCachePolicy), origin request policy, security headers policy
    - Move 3 CloudFront distributions (admin, public, media) with all behaviors and error responses
    - Move Route53 A records (conditional on domainName/hostedZone)
    - Apply `preserveLogicalId` to all resources
    - Expose adminDistribution, publicDistribution, mediaDistribution, mediaCdnUrl
    - _Requirements: 1.1, 2.1, 4.1, 4.3, 5.4_
  - [x] 8.2 Update barrel export to include CdnConstruct
    - _Requirements: 4.4_

- [x] 9. Implement WafConstruct
  - [x] 9.1 Create `lib/constructs/waf.ts` with WafConstructProps interface and WafConstruct class
    - Move WebACL with all 4 rules (RateLimit, CommentCaptcha, CommonRuleSet, KnownBadInputs)
    - Move WebACL-to-API-Gateway association with dependency
    - Apply `preserveLogicalId` to WebACL and association
    - Expose webAcl as public readonly property
    - _Requirements: 1.1, 2.1, 4.1, 4.3, 5.5_
  - [x] 9.2 Update barrel export to include WafConstruct
    - _Requirements: 4.4_

- [x] 10. Implement LambdaApiConstruct
  - [x] 10.1 Create `lib/constructs/lambda-api.ts` with LambdaApiConstructProps, LambdaFunctionConfig interface, and LambdaApiConstruct class
    - Define the `LambdaFunctionConfig` interface and `createLambdaFunction` factory method
    - Move the shared Lambda layer definition
    - Define commonEnv from props (table names, bucket name, user pool IDs, SES config, region)
    - _Requirements: 1.2, 3.1, 3.4, 4.1, 4.3, 5.7_
  - [x] 10.2 Define all Lambda function configs and create functions using factory
    - Define config arrays for content (5), media (4), users (7), settings (3), plugins (5), comments (4), auth (2), scheduler (1) functions
    - Use `createLambdaFunction` for each, applying logical ID preservation
    - Handle scheduler as special case (different timeout/memory, own env vars, EventBridge rule)
    - _Requirements: 3.2, 3.3_
  - [x] 10.3 Implement IAM permissions for all Lambda functions
    - Move all DynamoDB grantReadData/grantReadWriteData calls
    - Move S3 bucket grants (grantReadWrite, grantRead, grantDelete)
    - Move Cognito IAM policy statements (AdminGetUser, AdminCreateUser, etc.)
    - Move SES send email grants
    - Move CloudWatch PutMetricData grants
    - Move GSI query permission policy statements
    - _Requirements: 2.1_
  - [x] 10.4 Implement API Gateway route definitions
    - Move all API resource and method definitions (/api/v1/content, /media, /users, /settings, /plugins, /comments, /auth)
    - Preserve exact route structure with authorizer/public split
    - _Requirements: 1.2, 2.1_
  - [x] 10.5 Expose schedulerFunction, allFunctions map, and sharedLayer as public readonly properties
    - allFunctions map keys should match the alarm label names used in monitoring
    - _Requirements: 7.2_

- [x] 11. Checkpoint - Verify Lambda construct compiles
  - Ensure `npm run build` compiles without errors. Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement MonitoringConstruct
  - [x] 12.1 Create `lib/constructs/monitoring.ts` with MonitoringConstructProps interface and MonitoringConstruct class
    - Move SNS alarm topic with conditional email subscription
    - Move `createLambdaAlarms` helper and all Lambda alarm instantiations (error, duration, throttle per function)
    - Move API Gateway alarms (4xx, 5xx, latency)
    - Move DynamoDB alarms (content table read throttle, system errors)
    - Move Phase 2 alarms (SES bounce/complaint, user creation, comment spam, CAPTCHA, registration)
    - Move Phase 2 CloudWatch dashboard with all widgets
    - Apply `preserveLogicalId` to all alarm, topic, and dashboard resources
    - Expose alarmTopic and dashboardName
    - _Requirements: 1.3, 2.1, 4.1, 4.3, 5.8_
  - [x] 12.2 Update barrel export to include MonitoringConstruct
    - _Requirements: 4.4_

- [x] 13. Rewrite orchestrator stack
  - [x] 13.1 Rewrite `lib/serverless-cms-stack.ts` to import and instantiate all constructs
    - Keep ServerlessCmsStackProps interface unchanged
    - Keep public readonly property declarations
    - Add conditional Certificate/HostedZone lookup (unchanged logic)
    - Create API Gateway REST API + Cognito Authorizer (unchanged)
    - Instantiate constructs in dependency order: Database → Storage → Auth → Email → CDN → WAF → LambdaApi → Monitoring
    - Wire construct outputs to downstream construct props
    - Assign public readonly properties from construct outputs
    - _Requirements: 1.1, 1.4, 1.5, 4.2, 6.1_
  - [x] 13.2 Declare all CfnOutput resources in orchestrator
    - Move all ~30 CfnOutput declarations reading values from construct properties
    - Apply `preserveLogicalId` to each CfnOutput
    - Preserve conditional outputs (domainName-gated)
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 14. Verify entry point compatibility
  - [x] 14.1 Verify `bin/app.ts` remains unchanged and compiles
    - Confirm import path `../lib/serverless-cms-stack` still resolves
    - Confirm `ServerlessCmsStack` constructor call is compatible
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 15. Final verification
  - [x] 15.1 Run `npm run build` to verify zero TypeScript errors
    - _Requirements: 6.3_
  - [x] 15.2 Run `cdk synth` and compare logical IDs against captured monolith template
    - Synthesize refactored stack: `npx cdk synth --context environment=dev --no-staging`
    - Compare all resource logical IDs with `/tmp/monolith-template.json`
    - Verify zero differences in logical IDs
    - _Requirements: 2.2_
  - [x] 15.3 Run `cdk diff` against deployed stack to verify zero replacements
    - Execute `npx cdk diff --context environment=dev`
    - Confirm output shows no resource replacements or deletions
    - _Requirements: 2.3_
  - [x] 15.4 Run existing test suite to verify no regressions
    - Execute `npm test` to run all backend and infrastructure tests
    - _Requirements: 6.3_

## Notes

- No property-based tests are applicable — this is IaC refactoring verified by template comparison
- Logical IDs must be captured from the monolith BEFORE any refactoring begins (Task 1)
- The API Gateway and Authorizer stay in the orchestrator because they're used by CDN, WAF, and LambdaApi
- Certificate and HostedZone stay in the orchestrator because they're conditional and cross-region
- `lib/stack.ts` (if it exists) must remain unmodified per Requirement 6.4
