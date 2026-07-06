# Design Document: CDK Stack Refactor

## Architecture Overview

The monolithic `ServerlessCmsStack` (2340 lines) is decomposed into a hybrid construct architecture with an orchestrator stack that wires together 8 focused constructs.

```
ServerlessCmsStack (orchestrator)
├── DatabaseConstruct       — 6 DynamoDB tables + GSIs
├── StorageConstruct        — 3 S3 buckets (media, admin, public)
├── AuthConstruct           — Cognito UserPool + Client
├── EmailConstruct          — SES identity, config set, bounce/complaint SNS topics
├── CdnConstruct            — 3 CloudFront distributions, OAIs, cache policies, Route53
├── WafConstruct            — WebACL + API Gateway association
├── LambdaApiConstruct      — ~32 Lambda functions (factory), shared layer, API routes, IAM, EventBridge
└── MonitoringConstruct     — CloudWatch alarms, dashboard, SNS alarm topic
```

The orchestrator stack retains:
- API Gateway REST API + Cognito Authorizer (cross-cutting dependency)
- Certificate + Hosted Zone lookup (conditional, cross-region)
- All ~30 CfnOutput declarations
- Public readonly properties for cross-stack references

## File Structure

```
lib/
├── serverless-cms-stack.ts          — Orchestrator stack (imports, instantiation, wiring, outputs)
├── constructs/
│   ├── index.ts                     — Barrel re-export
│   ├── database.ts                  — DatabaseConstruct + DatabaseConstructProps
│   ├── storage.ts                   — StorageConstruct + StorageConstructProps
│   ├── auth.ts                      — AuthConstruct + AuthConstructProps
│   ├── email.ts                     — EmailConstruct + EmailConstructProps
│   ├── cdn.ts                       — CdnConstruct + CdnConstructProps
│   ├── waf.ts                       — WafConstruct + WafConstructProps
│   ├── lambda-api.ts                — LambdaApiConstruct + LambdaApiConstructProps
│   └── monitoring.ts                — MonitoringConstruct + MonitoringConstructProps
└── utils/
    └── logical-id.ts                — preserveLogicalId helper
```

## Logical ID Preservation Utility

A shared helper ensures every resource retains its original CloudFormation logical ID after being moved into a construct.

```typescript
// lib/utils/logical-id.ts
import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

/**
 * Override the logical ID of a CDK resource's underlying CfnResource
 * to preserve the original CloudFormation logical ID from the monolith stack.
 */
export function preserveLogicalId(resource: IConstruct, logicalId: string): void {
  const cfnResource = resource.node.defaultChild as cdk.CfnResource;
  if (cfnResource) {
    cfnResource.overrideLogicalId(logicalId);
  }
}
```

The mapping of construct IDs to original logical IDs is captured by running `cdk synth` on the current monolith before refactoring. Each construct applies `preserveLogicalId` to every resource it creates.

## Construct Interfaces

### DatabaseConstructProps

```typescript
export interface DatabaseConstructProps {
  environment: string;
}
```

**Exposes:** `contentTable`, `mediaTable`, `usersTable`, `settingsTable`, `pluginsTable`, `commentsTable` (all as `dynamodb.Table`)

### StorageConstructProps

```typescript
export interface StorageConstructProps {
  environment: string;
  accountId: string;
}
```

**Exposes:** `mediaBucket`, `adminBucket`, `publicBucket` (all as `s3.Bucket`)

### AuthConstructProps

```typescript
export interface AuthConstructProps {
  environment: string;
}
```

**Exposes:** `userPool` (as `cognito.UserPool`), `userPoolClient` (as `cognito.UserPoolClient`)

### EmailConstructProps

```typescript
export interface EmailConstructProps {
  environment: string;
  domainName?: string;
  alarmEmail?: string;
  sesFromEmail?: string;
}
```

**Exposes:** `sesFromEmail` (string), `sesConfigurationSetName` (string), `sesBouncesTopic` (sns.Topic), `sesComplaintsTopic` (sns.Topic)

### CdnConstructProps

```typescript
export interface CdnConstructProps {
  environment: string;
  domainName?: string;
  subdomain?: string;
  mediaBucket: s3.Bucket;
  adminBucket: s3.Bucket;
  publicBucket: s3.Bucket;
  api: apigateway.RestApi;
  certificate?: acm.ICertificate;
  hostedZone?: route53.IHostedZone;
}
```

**Exposes:** `adminDistribution`, `publicDistribution`, `mediaDistribution` (all as `cloudfront.Distribution`), `mediaCdnUrl` (string)

### WafConstructProps

```typescript
export interface WafConstructProps {
  environment: string;
  apiRestApiId: string;
  apiStageName: string;
  region: string;
}
```

**Exposes:** `webAcl` (wafv2.CfnWebACL)

### LambdaApiConstructProps

```typescript
export interface LambdaApiConstructProps {
  environment: string;
  contentTable: dynamodb.ITable;
  mediaTable: dynamodb.ITable;
  usersTable: dynamodb.ITable;
  settingsTable: dynamodb.ITable;
  pluginsTable: dynamodb.ITable;
  commentsTable: dynamodb.ITable;
  mediaBucket: s3.Bucket;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
  api: apigateway.RestApi;
  authorizer: apigateway.IAuthorizer;
  sesFromEmail: string;
  sesConfigurationSetName: string;
  mediaCdnUrl: string;
}
```

**Exposes:** `schedulerFunction` (lambda.Function), `allFunctions` (Map<string, lambda.Function>) for monitoring, `sharedLayer` (lambda.LayerVersion)

### MonitoringConstructProps

```typescript
export interface MonitoringConstructProps {
  environment: string;
  alarmEmail?: string;
  lambdaFunctions: Map<string, lambda.Function>;
  api: apigateway.RestApi;
  contentTable: dynamodb.ITable;
  commentsTable: dynamodb.ITable;
  sesFromEmail: string;
}
```

**Exposes:** `alarmTopic` (sns.Topic), `dashboardName` (string)

## Lambda Factory Pattern

The `LambdaApiConstruct` defines a configuration-driven factory for creating Lambda functions:

```typescript
interface LambdaFunctionConfig {
  /** Construct ID (e.g., 'ContentCreateFunction') */
  id: string;
  /** Function name suffix (e.g., 'content-create') */
  nameSuffix: string;
  /** Handler entry point (e.g., 'create.handler') */
  handler: string;
  /** Code asset path relative to project root (e.g., 'lambda/content') */
  codePath: string;
  /** Timeout in seconds (default: 30) */
  timeout?: number;
  /** Memory in MB (default: 512) */
  memorySize?: number;
  /** Additional environment variables beyond commonEnv */
  extraEnv?: Record<string, string>;
  /** Override description */
  description?: string;
  /** Original CloudFormation logical ID for preservation */
  logicalId: string;
}
```

The factory method:

```typescript
private createLambdaFunction(config: LambdaFunctionConfig): lambda.Function {
  const fn = new lambda.Function(this, config.id, {
    functionName: `cms-${config.nameSuffix}-${this.props.environment}`,
    runtime: lambda.Runtime.PYTHON_3_12,
    handler: config.handler,
    code: lambda.Code.fromAsset(config.codePath),
    timeout: cdk.Duration.seconds(config.timeout ?? 30),
    memorySize: config.memorySize ?? 512,
    environment: { ...this.commonEnv, ...(config.extraEnv ?? {}) },
    layers: [this.sharedLayer],
    description: config.description,
  });
  preserveLogicalId(fn, config.logicalId);
  return fn;
}
```

All ~32 Lambda functions are defined as config arrays grouped by domain:

```typescript
private readonly contentFunctions: LambdaFunctionConfig[] = [
  { id: 'ContentCreateFunction', nameSuffix: 'content-create', handler: 'create.handler', codePath: 'lambda/content', logicalId: 'ContentCreateFunction...' },
  { id: 'ContentGetFunction', nameSuffix: 'content-get', handler: 'get.handler', codePath: 'lambda/content', logicalId: 'ContentGetFunction...' },
  // ... etc
];
```

The scheduler function is special-cased (different timeout/memory, different env vars, no shared layer initially) but still uses the factory with overrides.

## Orchestrator Stack Wiring

The refactored `ServerlessCmsStack` constructor follows this sequence:

1. **Conditional lookups** — Certificate + HostedZone (if `domainName` is provided)
2. **Infrastructure constructs** — Database, Storage, Auth, Email (no cross-dependencies)
3. **API Gateway + Authorizer** — Created directly in orchestrator (cross-cutting)
4. **CDN construct** — Depends on Storage, API, Certificate, HostedZone
5. **WAF construct** — Depends on API (rest API ID + stage name)
6. **LambdaApi construct** — Depends on Database, Storage, Auth, Email, API, CDN (for mediaCdnUrl)
7. **Monitoring construct** — Depends on LambdaApi (all functions), API, Database
8. **CfnOutputs** — All ~30 outputs declared, reading from construct public properties

## CfnOutput Preservation Strategy

All CfnOutput declarations remain in the orchestrator stack. Each construct exposes the values needed via public readonly properties. Conditional outputs (gated on `props.domainName`) retain identical conditional logic.

The outputs must also have their logical IDs preserved via `overrideLogicalId` since CDK generates logical IDs for CfnOutput resources too.

## Dependency Graph

```
Database ─────────────────────────────┐
Storage ──────────────────────────┐   │
Auth ─────────────────────────┐   │   │
Email ────────────────────┐   │   │   │
                          │   │   │   │
API Gateway ──────────────┼───┼───┼───┤
                          │   │   │   │
CDN ← Storage, API, Cert  │   │   │   │
WAF ← API                 │   │   │   │
LambdaApi ← All above ────┘───┘───┘───┘
Monitoring ← LambdaApi, API, DB
```

## Error Handling

- If `domainName` is not provided, Certificate/HostedZone are undefined, CDN uses CloudFront default domains, and conditional CfnOutputs are skipped
- The WAF association depends on the API deployment stage; the `node.addDependency` is preserved
- Lambda functions that need SES permissions get them granted in the LambdaApi construct

## Verification Strategy

Since this is Infrastructure as Code refactoring, correctness is verified through:

1. **TypeScript compilation** (`npm run build`) — Verifies type safety of all props interfaces
2. **CDK synthesis** (`cdk synth`) — Produces CloudFormation template, verifies all resources are valid
3. **Template comparison** — Compare synthesized template logical IDs against the current monolith's template
4. **CDK diff** (`cdk diff`) — Against deployed stack, must show zero replacements/deletions
5. **Existing test suite** — Backend and frontend tests continue to pass (unchanged Lambda code)

No property-based testing is applicable here — IaC is declarative configuration, not functions with variable inputs. The verification approach is deterministic template comparison.
