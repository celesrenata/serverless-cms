import * as cdk from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct, IConstruct } from 'constructs';
import { preserveLogicalId } from '../utils/logical-id';

export interface LambdaApiConstructProps {
  environment: string;
  contentTable: dynamodb.ITable;
  mediaTable: dynamodb.ITable;
  usersTable: dynamodb.ITable;
  settingsTable: dynamodb.ITable;
  pluginsTable: dynamodb.ITable;
  commentsTable: dynamodb.ITable;
  sectionsTable: dynamodb.ITable;
  themesTable: dynamodb.ITable;
  mediaBucket: s3.Bucket;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
  api: apigateway.RestApi;
  authorizer: apigateway.IAuthorizer;
  sesFromEmail: string;
  sesConfigurationSetName: string;
  mediaCdnUrl: string;
}

interface LambdaFunctionConfig {
  id: string;
  nameSuffix: string;
  handler: string;
  codePath: string;
  timeout?: number;
  memorySize?: number;
  extraEnv?: Record<string, string>;
  description?: string;
  logicalId: string;
  serviceRoleLogicalId?: string;
  defaultPolicyLogicalId?: string;
}

export class LambdaApiConstruct extends Construct {
  public readonly schedulerFunction: lambda.Function;
  public readonly allFunctions: Map<string, lambda.Function> = new Map();
  public readonly sharedLayer: lambda.LayerVersion;

  private readonly props: LambdaApiConstructProps;
  private readonly commonEnv: Record<string, string>;
  private readonly pendingPolicyOverrides: Map<lambda.Function, string> = new Map();

  constructor(scope: Construct, id: string, props: LambdaApiConstructProps) {
    super(scope, id);

    this.props = props;

    // Shared Lambda Layer
    this.sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('lambda/layer'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
      description: 'Shared utilities for CMS Lambda functions',
    });
    preserveLogicalId(this.sharedLayer, 'SharedLayer27DFABF0');

    // Common environment variables
    this.commonEnv = {
      CONTENT_TABLE: props.contentTable.tableName,
      MEDIA_TABLE: props.mediaTable.tableName,
      USERS_TABLE: props.usersTable.tableName,
      SETTINGS_TABLE: props.settingsTable.tableName,
      PLUGINS_TABLE: props.pluginsTable.tableName,
      COMMENTS_TABLE: props.commentsTable.tableName,
      SECTIONS_TABLE: props.sectionsTable.tableName,
      THEMES_TABLE: props.themesTable.tableName,
      MEDIA_BUCKET: props.mediaBucket.bucketName,
      MEDIA_CDN_URL: props.mediaCdnUrl,
      COGNITO_REGION: cdk.Stack.of(this).region,
      USER_POOL_ID: props.userPool.userPoolId,
      USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
      ENVIRONMENT: props.environment,
      SES_FROM_EMAIL: props.sesFromEmail,
      SES_CONFIGURATION_SET: props.sesConfigurationSetName,
      SES_REGION: cdk.Stack.of(this).region,
    };

    // ─── Content Lambda Function (unified handler) ────────────────────
    const contentHandler = this.createFunction({
      id: 'ContentHandlerFunction', nameSuffix: 'content-handler',
      handler: 'handler', codePath: 'lambda/content',
      logicalId: 'ContentHandlerFunction',
    });

    // ─── Media Lambda Function (unified handler) ────────────────────────
    const mediaHandler = this.createFunction({
      id: 'MediaHandlerFunction', nameSuffix: 'media-handler',
      handler: 'handler', codePath: 'lambda/media',
      timeout: 60, memorySize: 1024,
      logicalId: 'MediaHandlerFunction',
    });

    // ─── Users Lambda Function (unified handler) ────────────────────────
    const usersHandler = this.createFunction({
      id: 'UsersHandlerFunction', nameSuffix: 'users-handler',
      handler: 'handler', codePath: 'lambda/users',
      logicalId: 'UsersHandlerFunction',
    });

    // ─── Settings Lambda Function (unified handler) ─────────────────────
    const settingsHandler = this.createFunction({
      id: 'SettingsHandlerFunction', nameSuffix: 'settings-handler',
      handler: 'handler', codePath: 'lambda/settings',
      logicalId: 'SettingsHandlerFunction',
    });

    // ─── Plugins Lambda Function (unified handler) ──────────────────────
    const pluginsHandler = this.createFunction({
      id: 'PluginsHandlerFunction', nameSuffix: 'plugins-handler',
      handler: 'handler', codePath: 'lambda/plugins',
      logicalId: 'PluginsHandlerFunction',
    });

    // ─── Comments Lambda Function (unified handler) ─────────────────────
    const commentsHandler = this.createFunction({
      id: 'CommentsHandlerFunction', nameSuffix: 'comments-handler',
      handler: 'handler', codePath: 'lambda/comments',
      logicalId: 'CommentsHandlerFunction',
    });

    // ─── Auth Lambda Function (unified handler) ─────────────────────────
    const authHandler = this.createFunction({
      id: 'AuthHandlerFunction', nameSuffix: 'auth-handler',
      handler: 'handler', codePath: 'lambda/auth',
      logicalId: 'AuthHandlerFunction',
    });

    // ─── Section Lambda Function (unified handler) ────────────────────
    const sectionHandler = this.createFunction({
      id: 'SectionHandlerFunction', nameSuffix: 'section-handler',
      handler: 'handler', codePath: 'lambda/sections',
      logicalId: 'SectionHandlerFunction',
    });

    // ─── Theme Lambda Function (unified handler) ──────────────────────
    const themeHandler = this.createFunction({
      id: 'ThemeHandlerFunction', nameSuffix: 'theme-handler',
      handler: 'handler', codePath: 'lambda/themes',
      logicalId: 'ThemeHandlerFunction',
    });

    // ─── Scheduler Function (custom env, no shared layer) ───────────────
    this.schedulerFunction = new lambda.Function(this, 'SchedulerFunction', {
      functionName: `cms-scheduler-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'publish_scheduled.handler',
      code: lambda.Code.fromAsset('lambda/scheduler'),
      timeout: Duration.minutes(5),
      memorySize: 256,
      environment: {
        CONTENT_TABLE: props.contentTable.tableName,
        ENVIRONMENT: props.environment,
      },
      description: 'Publishes scheduled content when scheduled_at time is reached',
    });
    preserveLogicalId(this.schedulerFunction, 'SchedulerFunction9ED01671');
    // Preserve scheduler service role logical ID
    {
      const cfnRole = (this.schedulerFunction.role as iam.Role).node.defaultChild as cdk.CfnResource;
      if (cfnRole) cfnRole.overrideLogicalId('SchedulerFunctionServiceRoleC8A0647B');
    }
    this.allFunctions.set('Scheduler', this.schedulerFunction);
    // Store scheduler default policy for deferred override
    this.pendingPolicyOverrides.set(this.schedulerFunction, 'SchedulerFunctionServiceRoleDefaultPolicyA8621E37');

    props.contentTable.grantReadWriteData(this.schedulerFunction);

    // EventBridge Rule to trigger scheduler every 5 minutes
    const schedulerRule = new events.Rule(this, 'SchedulerRule', {
      ruleName: `cms-scheduler-rule-${props.environment}`,
      description: 'Triggers scheduler Lambda every 5 minutes to publish scheduled content',
      schedule: events.Schedule.rate(Duration.minutes(5)),
      enabled: true,
    });
    preserveLogicalId(schedulerRule, 'SchedulerRule4596AC40');
    schedulerRule.addTarget(new targets.LambdaFunction(this.schedulerFunction, {
      retryAttempts: 2,
    }));
    // Preserve the EventBridge -> Lambda permission logical ID using Aspects
    cdk.Aspects.of(this).add({
      visit(node: IConstruct) {
        if (node instanceof lambda.CfnPermission) {
          const currentId = cdk.Stack.of(node).getLogicalId(node);
          if (currentId.includes('SchedulerRule') && currentId.includes('AllowEventRule')) {
            node.overrideLogicalId('SchedulerRuleAllowEventRuleServerlessCmsStackdevSchedulerFunction56679AE80E17D45F');
          }
        }
      },
    });

    // ─── IAM Permissions ────────────────────────────────────────────────

    // Content handler permissions
    props.contentTable.grantReadWriteData(contentHandler);
    this.grantDynamoDbIndexQuery(contentHandler, props.contentTable);
    props.pluginsTable.grantReadData(contentHandler);
    props.usersTable.grantReadWriteData(contentHandler);
    props.sectionsTable.grantReadData(contentHandler);
    this.grantCognito(contentHandler, ['cognito-idp:AdminGetUser']);

    // Media handler permissions
    props.mediaTable.grantReadWriteData(mediaHandler);
    props.mediaBucket.grantReadWrite(mediaHandler);
    props.mediaBucket.grantDelete(mediaHandler);
    props.pluginsTable.grantReadData(mediaHandler);
    props.usersTable.grantReadData(mediaHandler);

    // Users handler permissions
    props.usersTable.grantReadWriteData(usersHandler);
    this.grantCognito(usersHandler, [
      'cognito-idp:AdminGetUser', 'cognito-idp:AdminUpdateUserAttributes',
      'cognito-idp:AdminCreateUser', 'cognito-idp:AdminSetUserPassword',
      'cognito-idp:AdminDeleteUser', 'cognito-idp:AdminResetUserPassword',
    ]);
    this.grantSesSendEmail(usersHandler);
    this.grantCloudWatchPutMetricData(usersHandler);

    // Settings handler permissions
    props.settingsTable.grantReadWriteData(settingsHandler);
    props.usersTable.grantReadData(settingsHandler);

    // Plugins handler permissions
    props.pluginsTable.grantReadWriteData(pluginsHandler);
    props.settingsTable.grantReadWriteData(pluginsHandler);
    props.usersTable.grantReadData(pluginsHandler);

    // Comments handler permissions
    props.commentsTable.grantReadWriteData(commentsHandler);
    this.grantDynamoDbIndexQuery(commentsHandler, props.commentsTable);
    props.contentTable.grantReadData(commentsHandler);
    props.settingsTable.grantReadData(commentsHandler);
    props.usersTable.grantReadData(commentsHandler);
    this.grantCloudWatchPutMetricData(commentsHandler);

    // Auth handler permissions
    props.usersTable.grantReadWriteData(authHandler);
    this.grantCognito(authHandler, [
      'cognito-idp:AdminCreateUser', 'cognito-idp:AdminSetUserPassword',
      'cognito-idp:AdminUpdateUserAttributes', 'cognito-idp:ListUsers',
      'cognito-idp:AdminConfirmSignUp',
    ]);
    this.grantSesSendEmail(authHandler);
    this.grantCloudWatchPutMetricData(authHandler);

    // Section function permissions
    props.sectionsTable.grantReadWriteData(sectionHandler);
    props.contentTable.grantReadData(sectionHandler);
    this.grantDynamoDbIndexQuery(sectionHandler, props.sectionsTable);
    this.grantDynamoDbIndexQuery(sectionHandler, props.contentTable);
    props.usersTable.grantReadData(sectionHandler);

    // Theme function permissions
    props.themesTable.grantReadWriteData(themeHandler);
    props.settingsTable.grantReadWriteData(themeHandler);
    props.usersTable.grantReadData(themeHandler);

    // ─── API Gateway Routes ─────────────────────────────────────────────
    const apiV1 = props.api.root.addResource('api').addResource('v1');

    // Content endpoints: /api/v1/content
    const contentResource = apiV1.addResource('content');
    contentResource.addMethod('POST', new apigateway.LambdaIntegration(contentHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    contentResource.addMethod('GET', new apigateway.LambdaIntegration(contentHandler));

    const contentIdResource = contentResource.addResource('{id}');
    contentIdResource.addMethod('GET', new apigateway.LambdaIntegration(contentHandler));
    contentIdResource.addMethod('PUT', new apigateway.LambdaIntegration(contentHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    contentIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(contentHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const contentSlugResource = contentResource.addResource('slug').addResource('{slug}');
    contentSlugResource.addMethod('GET', new apigateway.LambdaIntegration(contentHandler));

    // Media endpoints: /api/v1/media
    const mediaResource = apiV1.addResource('media');
    mediaResource.addMethod('GET', new apigateway.LambdaIntegration(mediaHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const mediaUploadResource = mediaResource.addResource('upload');
    mediaUploadResource.addMethod('POST', new apigateway.LambdaIntegration(mediaHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const mediaIdResource = mediaResource.addResource('{id}');
    mediaIdResource.addMethod('GET', new apigateway.LambdaIntegration(mediaHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    mediaIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(mediaHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // User endpoints: /api/v1/users
    const usersResource = apiV1.addResource('users');
    usersResource.addMethod('GET', new apigateway.LambdaIntegration(usersHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    usersResource.addMethod('POST', new apigateway.LambdaIntegration(usersHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const usersMeResource = usersResource.addResource('me');
    usersMeResource.addMethod('GET', new apigateway.LambdaIntegration(usersHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    usersMeResource.addMethod('PUT', new apigateway.LambdaIntegration(usersHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const userIdResource = usersResource.addResource('{id}');
    userIdResource.addMethod('PUT', new apigateway.LambdaIntegration(usersHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    userIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(usersHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const userResetPasswordResource = userIdResource.addResource('reset-password');
    userResetPasswordResource.addMethod('POST', new apigateway.LambdaIntegration(usersHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Settings endpoints: /api/v1/settings
    const settingsResource = apiV1.addResource('settings');
    settingsResource.addMethod('GET', new apigateway.LambdaIntegration(settingsHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    settingsResource.addMethod('PUT', new apigateway.LambdaIntegration(settingsHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const settingsPublicResource = settingsResource.addResource('public');
    settingsPublicResource.addMethod('GET', new apigateway.LambdaIntegration(settingsHandler));

    // Plugin endpoints: /api/v1/plugins
    const pluginsResource = apiV1.addResource('plugins');
    pluginsResource.addMethod('GET', new apigateway.LambdaIntegration(pluginsHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const pluginInstallResource = pluginsResource.addResource('install');
    pluginInstallResource.addMethod('POST', new apigateway.LambdaIntegration(pluginsHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const pluginIdResource = pluginsResource.addResource('{id}');
    const pluginActivateResource = pluginIdResource.addResource('activate');
    pluginActivateResource.addMethod('POST', new apigateway.LambdaIntegration(pluginsHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const pluginDeactivateResource = pluginIdResource.addResource('deactivate');
    pluginDeactivateResource.addMethod('POST', new apigateway.LambdaIntegration(pluginsHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const pluginSettingsResource = pluginIdResource.addResource('settings');
    pluginSettingsResource.addMethod('GET', new apigateway.LambdaIntegration(pluginsHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    pluginSettingsResource.addMethod('PUT', new apigateway.LambdaIntegration(pluginsHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Comment endpoints: /api/v1/content/{id}/comments (public)
    const contentCommentsResource = contentIdResource.addResource('comments');
    contentCommentsResource.addMethod('GET', new apigateway.LambdaIntegration(commentsHandler));
    contentCommentsResource.addMethod('POST', new apigateway.LambdaIntegration(commentsHandler));

    // Comment moderation endpoints: /api/v1/comments (authenticated)
    const commentsResource = apiV1.addResource('comments');
    commentsResource.addMethod('GET', new apigateway.LambdaIntegration(commentsHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const commentIdResource = commentsResource.addResource('{id}');
    commentIdResource.addMethod('PUT', new apigateway.LambdaIntegration(commentsHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    commentIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(commentsHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Auth endpoints: /api/v1/auth (public)
    const authResource = apiV1.addResource('auth');
    const registerResource = authResource.addResource('register');
    registerResource.addMethod('POST', new apigateway.LambdaIntegration(authHandler));

    const verifyEmailResource = authResource.addResource('verify-email');
    verifyEmailResource.addMethod('POST', new apigateway.LambdaIntegration(authHandler));

    // Section endpoints: /api/v1/sections (authenticated)
    const sectionsResource = apiV1.addResource('sections');
    sectionsResource.addMethod('POST', new apigateway.LambdaIntegration(sectionHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    sectionsResource.addMethod('GET', new apigateway.LambdaIntegration(sectionHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const sectionIdResource = sectionsResource.addResource('{id}');
    sectionIdResource.addMethod('GET', new apigateway.LambdaIntegration(sectionHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    sectionIdResource.addMethod('PUT', new apigateway.LambdaIntegration(sectionHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    sectionIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(sectionHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Public section endpoints: /api/v1/public/sections (unauthenticated)
    const publicResource = apiV1.addResource('public');
    const publicSectionsResource = publicResource.addResource('sections');

    const publicSectionsTreeResource = publicSectionsResource.addResource('tree');
    publicSectionsTreeResource.addMethod('GET', new apigateway.LambdaIntegration(sectionHandler));

    const publicSectionsPathResource = publicSectionsResource.addResource('path');
    const publicSectionsPathProxy = publicSectionsPathResource.addResource('{path+}');
    publicSectionsPathProxy.addMethod('GET', new apigateway.LambdaIntegration(sectionHandler));

    const publicSectionIdResource = publicSectionsResource.addResource('{id}');
    const publicSectionPostsResource = publicSectionIdResource.addResource('posts');
    publicSectionPostsResource.addMethod('GET', new apigateway.LambdaIntegration(sectionHandler));

    // Theme endpoints: /api/v1/themes
    const themesResource = apiV1.addResource('themes');
    themesResource.addMethod('GET', new apigateway.LambdaIntegration(themeHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    themesResource.addMethod('POST', new apigateway.LambdaIntegration(themeHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Public endpoint: GET /api/v1/themes/active (no auth)
    const themeActiveResource = themesResource.addResource('active');
    themeActiveResource.addMethod('GET', new apigateway.LambdaIntegration(themeHandler));

    const themeIdResource = themesResource.addResource('{id}');
    themeIdResource.addMethod('GET', new apigateway.LambdaIntegration(themeHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    themeIdResource.addMethod('PUT', new apigateway.LambdaIntegration(themeHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    themeIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(themeHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const themeActivateResource = themeIdResource.addResource('activate');
    themeActivateResource.addMethod('POST', new apigateway.LambdaIntegration(themeHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const themeDuplicateResource = themeIdResource.addResource('duplicate');
    themeDuplicateResource.addMethod('POST', new apigateway.LambdaIntegration(themeHandler), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Apply deferred logical ID overrides for service role default policies
    this.applyDeferredPolicyOverrides();
  }

  // ─── Private Helper Methods ─────────────────────────────────────────

  private createFunction(config: LambdaFunctionConfig): lambda.Function {
    const fn = new lambda.Function(this, config.id, {
      functionName: `cms-${config.nameSuffix}-${this.props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: `${config.handler}.handler`,
      code: lambda.Code.fromAsset(config.codePath),
      timeout: Duration.seconds(config.timeout || 30),
      memorySize: config.memorySize || 512,
      environment: { ...this.commonEnv, ...(config.extraEnv || {}) },
      layers: [this.sharedLayer],
      description: config.description,
    });
    preserveLogicalId(fn, config.logicalId);
    // Preserve service role logical ID
    if (config.serviceRoleLogicalId && fn.role) {
      const cfnRole = (fn.role as iam.Role).node.defaultChild as cdk.CfnResource;
      if (cfnRole) cfnRole.overrideLogicalId(config.serviceRoleLogicalId);
    }
    this.allFunctions.set(config.id, fn);
    // Store default policy logical ID for later override
    if (config.defaultPolicyLogicalId) {
      this.pendingPolicyOverrides.set(fn, config.defaultPolicyLogicalId);
    }
    return fn;
  }

  /**
   * Apply deferred logical ID overrides for DefaultPolicy resources.
   * Must be called at the end of the constructor after all permissions are granted.
   */
  private applyDeferredPolicyOverrides(): void {
    for (const [fn, logicalId] of this.pendingPolicyOverrides) {
      const role = fn.role as iam.Role;
      const defaultPolicy = role.node.tryFindChild('DefaultPolicy');
      if (defaultPolicy) {
        const cfnPolicy = (defaultPolicy as cdk.Resource).node.defaultChild as cdk.CfnResource;
        if (cfnPolicy) cfnPolicy.overrideLogicalId(logicalId);
      }
    }
  }

  private grantDynamoDbIndexQuery(fn: lambda.Function, table: dynamodb.ITable): void {
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['dynamodb:Query'],
      resources: [`${table.tableArn}/index/*`],
    }));
  }

  private grantCognito(fn: lambda.Function, actions: string[]): void {
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions,
      resources: [this.props.userPool.userPoolArn],
    }));
  }

  private grantSesSendEmail(fn: lambda.Function): void {
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail', 'ses:SendTemplatedEmail'],
      resources: ['*'],
    }));
  }

  private grantCloudWatchPutMetricData(fn: lambda.Function): void {
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
    }));
  }
}
