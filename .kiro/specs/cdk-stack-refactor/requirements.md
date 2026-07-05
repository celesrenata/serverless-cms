# Requirements Document

## Introduction

Refactor the monolithic CDK stack (`lib/serverless-cms-stack.ts`, 2340 lines) into well-structured, modular constructs following AWS CDK best practices. The refactoring preserves CloudFormation logical IDs to ensure zero resource replacements on deployment. The monolith is decomposed into a hybrid structure: infrastructure constructs (Database, Storage, Auth, CDN, WAF, Email) at the base, a single LambdaApi construct for all Lambda functions and API Gateway routes using a factory pattern, and a Monitoring construct that wraps everything.

## Glossary

- **Monolith_Stack**: The existing single-file CDK stack at `lib/serverless-cms-stack.ts` containing all 2340 lines of infrastructure definitions
- **Construct**: An AWS CDK L3 building block that encapsulates a group of related resources within a single TypeScript class extending `Construct`
- **Logical_ID**: The CloudFormation logical identifier assigned to each resource, which must be preserved to avoid resource replacement during deployment
- **Factory_Function**: A helper function (`createLambdaFunction`) that accepts a configuration object and returns a Lambda function, reducing repetition across ~30 Lambda definitions
- **Infrastructure_Construct**: A Construct encapsulating foundational AWS resources (DynamoDB tables, S3 buckets, Cognito, CloudFront, WAF, SES)
- **LambdaApi_Construct**: A single Construct encapsulating all Lambda function definitions, IAM permissions, and API Gateway route integrations
- **Monitoring_Construct**: A Construct encapsulating CloudWatch alarms, dashboards, and SNS alarm topics
- **overrideLogicalId**: The CDK method `(resource.node.defaultChild as cdk.CfnResource).overrideLogicalId(id)` used to pin a resource's CloudFormation logical ID to a fixed value
- **Orchestrator_Stack**: The refactored top-level stack class (`ServerlessCmsStack`) that instantiates all constructs and wires them together via props interfaces
- **Props_Interface**: A TypeScript interface defining the inputs each construct accepts from the orchestrator stack

## Requirements

### Requirement 1: Construct Decomposition

**User Story:** As a developer, I want the monolithic stack decomposed into focused constructs, so that each module has a single responsibility and is easier to understand and maintain.

#### Acceptance Criteria

1. THE Orchestrator_Stack SHALL instantiate exactly the following Infrastructure_Constructs: Database, Storage, Auth, CDN, WAF, and Email.
2. THE Orchestrator_Stack SHALL instantiate exactly one LambdaApi_Construct that encapsulates all Lambda function definitions and API Gateway route integrations.
3. THE Orchestrator_Stack SHALL instantiate exactly one Monitoring_Construct that encapsulates all CloudWatch alarms, dashboards, and SNS topics.
4. WHEN a Construct is instantiated, THE Orchestrator_Stack SHALL pass dependencies via a typed Props_Interface rather than accessing sibling constructs directly.
5. THE Orchestrator_Stack SHALL expose the same public readonly properties as the current Monolith_Stack (contentTable, mediaTable, usersTable, settingsTable, pluginsTable, commentsTable, mediaBucket, adminBucket, publicBucket, userPool, userPoolClient, schedulerFunction, api, authorizer, adminDistribution, publicDistribution, certificate, hostedZone).

### Requirement 2: Logical ID Preservation

**User Story:** As a DevOps engineer, I want all CloudFormation logical IDs preserved after refactoring, so that `cdk diff` shows zero resource replacements and existing deployments are unaffected.

#### Acceptance Criteria

1. WHEN a resource is moved into a Construct, THE Construct SHALL call overrideLogicalId on that resource's CfnResource node to set it to the original Monolith_Stack logical ID.
2. THE Orchestrator_Stack SHALL produce a CloudFormation template where every resource logical ID matches the template produced by the Monolith_Stack for the same input props.
3. WHEN `cdk diff` is run against a previously deployed stack, THE refactored Orchestrator_Stack SHALL report zero resource replacements and zero resource deletions.

### Requirement 3: Lambda Factory Pattern

**User Story:** As a developer, I want Lambda function definitions created via a factory function with config objects, so that adding or modifying functions requires changing only a declarative config entry.

#### Acceptance Criteria

1. THE LambdaApi_Construct SHALL define a Factory_Function named `createLambdaFunction` that accepts a configuration object specifying function name, handler, code asset path, timeout, memory size, environment variables, layers, and construct ID.
2. WHEN the Factory_Function is invoked, THE LambdaApi_Construct SHALL create a Lambda function resource with the specified properties and call overrideLogicalId to preserve the original logical ID.
3. THE LambdaApi_Construct SHALL define all ~30 Lambda functions using the Factory_Function with individual config objects rather than repeated inline `new lambda.Function(...)` calls.
4. THE Factory_Function SHALL apply shared defaults (runtime Python 3.12, shared layer, common environment variables) that individual configs can override.

### Requirement 4: File and Module Organization

**User Story:** As a developer, I want each construct in its own file under a constructs directory, so that I can navigate the codebase by domain concern.

#### Acceptance Criteria

1. THE refactored code SHALL place each Construct in a separate file under `lib/constructs/` (e.g., `lib/constructs/database.ts`, `lib/constructs/storage.ts`, `lib/constructs/auth.ts`, `lib/constructs/cdn.ts`, `lib/constructs/waf.ts`, `lib/constructs/email.ts`, `lib/constructs/lambda-api.ts`, `lib/constructs/monitoring.ts`).
2. THE Orchestrator_Stack file (`lib/serverless-cms-stack.ts`) SHALL contain only the stack class definition, construct imports, construct instantiation, inter-construct wiring, and CfnOutput declarations.
3. WHEN a new construct file is added, THE file SHALL export a single Construct class and its Props_Interface.
4. THE `lib/constructs/` directory SHALL contain an `index.ts` barrel file that re-exports all constructs.

### Requirement 5: Props Interface Design

**User Story:** As a developer, I want well-defined TypeScript interfaces for construct props, so that dependencies between constructs are explicit and type-checked at compile time.

#### Acceptance Criteria

1. THE Database Construct SHALL accept a Props_Interface containing only `environment: string`.
2. THE Storage Construct SHALL accept a Props_Interface containing `environment: string` and `accountId: string`.
3. THE Auth Construct SHALL accept a Props_Interface containing `environment: string`.
4. THE CDN Construct SHALL accept a Props_Interface containing references to the S3 buckets, API Gateway, certificate, hosted zone, environment, domain configuration, and subdomain.
5. THE WAF Construct SHALL accept a Props_Interface containing the API Gateway rest API ID, region, and environment.
6. THE Email Construct SHALL accept a Props_Interface containing environment, domain name, and alarm email.
7. THE LambdaApi_Construct SHALL accept a Props_Interface containing references to all DynamoDB tables, S3 media bucket, Cognito user pool and client, shared layer, environment, SES configuration, and the API Gateway REST API with its authorizer.
8. THE Monitoring_Construct SHALL accept a Props_Interface containing references to all Lambda functions, the API Gateway, DynamoDB tables, alarm email, and environment.

### Requirement 6: Existing Entry Point Compatibility

**User Story:** As a DevOps engineer, I want `bin/app.ts` and the existing `ServerlessCmsStackProps` interface to remain unchanged, so that no deployment scripts or CI/CD pipelines need modification.

#### Acceptance Criteria

1. THE refactored code SHALL keep the `ServerlessCmsStackProps` interface at `lib/serverless-cms-stack.ts` with the same shape (environment, domainName?, subdomain?, alarmEmail?, sesFromEmail?).
2. THE `bin/app.ts` entry point SHALL remain unchanged and continue to import `ServerlessCmsStack` from `../lib/serverless-cms-stack`.
3. WHEN `npm run build` is executed, THE TypeScript compiler SHALL produce zero errors.
4. THE existing `lib/stack.ts` file SHALL remain unmodified.

### Requirement 7: CfnOutput Preservation

**User Story:** As a DevOps engineer, I want all existing CloudFormation outputs preserved with their original logical IDs, so that downstream scripts referencing these outputs continue to work.

#### Acceptance Criteria

1. THE Orchestrator_Stack SHALL declare all ~30 CfnOutput resources with the same logical IDs and values as the current Monolith_Stack.
2. WHEN a CfnOutput references a resource from a Construct, THE Construct SHALL expose that value via a public readonly property.
3. IF a CfnOutput is conditional (e.g., custom domain outputs gated on `props.domainName`), THEN THE Orchestrator_Stack SHALL apply the same conditional logic as the Monolith_Stack.
