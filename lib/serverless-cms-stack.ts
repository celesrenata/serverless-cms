import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export interface ServerlessCmsStackProps extends cdk.StackProps {
  environment: string;
  domainName?: string;
  alarmEmail?: string; // Email address for alarm notifications
}

export class ServerlessCmsStack extends cdk.Stack {
  public readonly contentTable: dynamodb.Table;
  public readonly mediaTable: dynamodb.Table;
  public readonly usersTable: dynamodb.Table;
  public readonly settingsTable: dynamodb.Table;
  public readonly pluginsTable: dynamodb.Table;
  public readonly mediaBucket: s3.Bucket;
  public readonly adminBucket: s3.Bucket;
  public readonly publicBucket: s3.Bucket;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly schedulerFunction: lambda.Function;
  public readonly api: apigateway.RestApi;
  public readonly authorizer: apigateway.CognitoUserPoolsAuthorizer;
  public readonly adminDistribution: cloudfront.Distribution;
  public readonly publicDistribution: cloudfront.Distribution;
  public readonly certificate?: acm.Certificate;
  public readonly hostedZone?: route53.IHostedZone;

  constructor(scope: Construct, id: string, props: ServerlessCmsStackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    // Import existing tables instead of creating new ones
    
    // Content Table
    this.contentTable = dynamodb.Table.fromTableName(
      this,
      'ContentTable',
      `cms-content-${props.environment}`
    );

    // Media Table
    this.mediaTable = dynamodb.Table.fromTableName(
      this,
      'MediaTable',
      `cms-media-${props.environment}`
    );

    // Users Table
    this.usersTable = dynamodb.Table.fromTableName(
      this,
      'UsersTable',
      `cms-users-${props.environment}`
    );

    // Settings Table
    this.settingsTable = dynamodb.Table.fromTableName(
      this,
      'SettingsTable',
      `cms-settings-${props.environment}`
    );

    // Plugins Table
    this.pluginsTable = dynamodb.Table.fromTableName(
      this,
      'PluginsTable',
      `cms-plugins-${props.environment}`
    );

    // S3 Buckets
    // Note: Using RETAIN removal policy to prevent accidental deletion
    // Fresh deployment after stack cleanup

    // Media Bucket - for uploaded files and generated thumbnails
    this.mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: `cms-media-${props.environment}-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      versioned: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ['*'], // Should be restricted to specific domains in production
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
    });

    // Add bucket policy to allow public read access to media files
    this.mediaBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:GetObject'],
        resources: [`${this.mediaBucket.bucketArn}/*`],
      })
    );

    // Admin Panel Bucket - for hosting the React admin application
    this.adminBucket = new s3.Bucket(this, 'AdminBucket', {
      bucketName: `cms-admin-${props.environment}-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA routing support
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
    });

    // Public Website Bucket - for hosting the React public website
    this.publicBucket = new s3.Bucket(this, 'PublicBucket', {
      bucketName: `cms-public-${props.environment}-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA routing support
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
    });

    // Cognito User Pool for authentication
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `cms-users-${props.environment}`,
      selfSignUpEnabled: false, // Only admins can create users
      signInAliases: {
        email: true,
        username: false,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(7),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
      },
      customAttributes: {
        role: new cognito.StringAttribute({ 
          minLen: 1, 
          maxLen: 20,
          mutable: true,
        }),
      },
    });

    // User Pool Client for Admin Panel
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `cms-admin-client-${props.environment}`,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false, // For browser-based apps
      accessTokenValidity: cdk.Duration.hours(24),
      idTokenValidity: cdk.Duration.hours(24),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true,
    });

    // Lambda Functions

    // Scheduler Lambda Function for publishing scheduled content
    this.schedulerFunction = new lambda.Function(this, 'SchedulerFunction', {
      functionName: `cms-scheduler-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'publish_scheduled.handler',
      code: lambda.Code.fromAsset('lambda/scheduler'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      environment: {
        CONTENT_TABLE: this.contentTable.tableName,
        ENVIRONMENT: props.environment,
      },
      description: 'Publishes scheduled content when scheduled_at time is reached',
    });

    // Grant DynamoDB permissions to scheduler function
    this.contentTable.grantReadWriteData(this.schedulerFunction);

    // EventBridge Rule to trigger scheduler every 5 minutes
    const schedulerRule = new events.Rule(this, 'SchedulerRule', {
      ruleName: `cms-scheduler-rule-${props.environment}`,
      description: 'Triggers scheduler Lambda every 5 minutes to publish scheduled content',
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      enabled: true,
    });

    // Add scheduler Lambda as target for the EventBridge rule
    schedulerRule.addTarget(new targets.LambdaFunction(this.schedulerFunction, {
      retryAttempts: 2,
    }));

    // API Gateway REST API
    this.api = new apigateway.RestApi(this, 'CmsApi', {
      restApiName: `cms-api-${props.environment}`,
      description: 'Serverless CMS API',
      deployOptions: {
        stageName: props.environment,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // Should be restricted in production
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
    });

    // Cognito Authorizer for protected endpoints
    this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [this.userPool],
      authorizerName: `cms-authorizer-${props.environment}`,
      identitySource: 'method.request.header.Authorization',
    });

    // Shared Lambda Layer for common code
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('lambda/layer'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
      description: 'Shared utilities for CMS Lambda functions',
    });

    // Common environment variables for Lambda functions
    const commonEnv = {
      CONTENT_TABLE: this.contentTable.tableName,
      MEDIA_TABLE: this.mediaTable.tableName,
      USERS_TABLE: this.usersTable.tableName,
      SETTINGS_TABLE: this.settingsTable.tableName,
      PLUGINS_TABLE: this.pluginsTable.tableName,
      MEDIA_BUCKET: this.mediaBucket.bucketName,
      COGNITO_REGION: this.region,
      USER_POOL_ID: this.userPool.userPoolId,
      ENVIRONMENT: props.environment,
    };

    // Content Lambda Functions
    const contentCreateFunction = new lambda.Function(this, 'ContentCreateFunction', {
      functionName: `cms-content-create-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'create.handler',
      code: lambda.Code.fromAsset('lambda/content'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const contentGetFunction = new lambda.Function(this, 'ContentGetFunction', {
      functionName: `cms-content-get-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'get.handler',
      code: lambda.Code.fromAsset('lambda/content'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const contentListFunction = new lambda.Function(this, 'ContentListFunction', {
      functionName: `cms-content-list-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('lambda/content'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const contentUpdateFunction = new lambda.Function(this, 'ContentUpdateFunction', {
      functionName: `cms-content-update-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'update.handler',
      code: lambda.Code.fromAsset('lambda/content'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const contentDeleteFunction = new lambda.Function(this, 'ContentDeleteFunction', {
      functionName: `cms-content-delete-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'delete.handler',
      code: lambda.Code.fromAsset('lambda/content'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    // Grant permissions to content functions
    this.contentTable.grantReadWriteData(contentCreateFunction);
    this.contentTable.grantReadWriteData(contentGetFunction);
    this.contentTable.grantReadWriteData(contentListFunction);
    this.contentTable.grantReadWriteData(contentUpdateFunction);
    this.contentTable.grantReadWriteData(contentDeleteFunction);
    this.pluginsTable.grantReadData(contentCreateFunction);
    this.pluginsTable.grantReadData(contentGetFunction);
    this.pluginsTable.grantReadData(contentUpdateFunction);
    this.pluginsTable.grantReadData(contentDeleteFunction);
    this.usersTable.grantReadData(contentCreateFunction);
    this.usersTable.grantReadData(contentUpdateFunction);
    this.usersTable.grantReadData(contentDeleteFunction);

    // Media Lambda Functions
    const mediaUploadFunction = new lambda.Function(this, 'MediaUploadFunction', {
      functionName: `cms-media-upload-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'upload.handler',
      code: lambda.Code.fromAsset('lambda/media'),
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const mediaGetFunction = new lambda.Function(this, 'MediaGetFunction', {
      functionName: `cms-media-get-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'get.handler',
      code: lambda.Code.fromAsset('lambda/media'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const mediaListFunction = new lambda.Function(this, 'MediaListFunction', {
      functionName: `cms-media-list-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('lambda/media'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const mediaDeleteFunction = new lambda.Function(this, 'MediaDeleteFunction', {
      functionName: `cms-media-delete-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'delete.handler',
      code: lambda.Code.fromAsset('lambda/media'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    // Grant permissions to media functions
    this.mediaTable.grantReadWriteData(mediaUploadFunction);
    this.mediaTable.grantReadData(mediaGetFunction);
    this.mediaTable.grantReadData(mediaListFunction);
    this.mediaTable.grantReadWriteData(mediaDeleteFunction);
    this.mediaBucket.grantReadWrite(mediaUploadFunction);
    this.mediaBucket.grantRead(mediaGetFunction);
    this.mediaBucket.grantDelete(mediaDeleteFunction);
    this.pluginsTable.grantReadData(mediaUploadFunction);
    this.pluginsTable.grantReadData(mediaDeleteFunction);

    // User Lambda Functions
    const userGetMeFunction = new lambda.Function(this, 'UserGetMeFunction', {
      functionName: `cms-user-get-me-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'get_me.handler',
      code: lambda.Code.fromAsset('lambda/users'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const userUpdateMeFunction = new lambda.Function(this, 'UserUpdateMeFunction', {
      functionName: `cms-user-update-me-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'update_me.handler',
      code: lambda.Code.fromAsset('lambda/users'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const userListFunction = new lambda.Function(this, 'UserListFunction', {
      functionName: `cms-user-list-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('lambda/users'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    // Grant permissions to user functions
    this.usersTable.grantReadData(userGetMeFunction);
    this.usersTable.grantReadWriteData(userUpdateMeFunction);
    this.usersTable.grantReadData(userListFunction);

    // Settings Lambda Functions
    const settingsGetFunction = new lambda.Function(this, 'SettingsGetFunction', {
      functionName: `cms-settings-get-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'get.handler',
      code: lambda.Code.fromAsset('lambda/settings'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const settingsUpdateFunction = new lambda.Function(this, 'SettingsUpdateFunction', {
      functionName: `cms-settings-update-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'update.handler',
      code: lambda.Code.fromAsset('lambda/settings'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    // Grant permissions to settings functions
    this.settingsTable.grantReadData(settingsGetFunction);
    this.settingsTable.grantReadWriteData(settingsUpdateFunction);

    // Plugin Lambda Functions
    const pluginInstallFunction = new lambda.Function(this, 'PluginInstallFunction', {
      functionName: `cms-plugin-install-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'install.handler',
      code: lambda.Code.fromAsset('lambda/plugins'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const pluginActivateFunction = new lambda.Function(this, 'PluginActivateFunction', {
      functionName: `cms-plugin-activate-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'activate.handler',
      code: lambda.Code.fromAsset('lambda/plugins'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const pluginDeactivateFunction = new lambda.Function(this, 'PluginDeactivateFunction', {
      functionName: `cms-plugin-deactivate-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'deactivate.handler',
      code: lambda.Code.fromAsset('lambda/plugins'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const pluginListFunction = new lambda.Function(this, 'PluginListFunction', {
      functionName: `cms-plugin-list-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('lambda/plugins'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const pluginGetSettingsFunction = new lambda.Function(this, 'PluginGetSettingsFunction', {
      functionName: `cms-plugin-get-settings-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'get_settings.handler',
      code: lambda.Code.fromAsset('lambda/plugins'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const pluginUpdateSettingsFunction = new lambda.Function(this, 'PluginUpdateSettingsFunction', {
      functionName: `cms-plugin-update-settings-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'update_settings.handler',
      code: lambda.Code.fromAsset('lambda/plugins'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    // Grant permissions to plugin functions
    this.pluginsTable.grantReadWriteData(pluginInstallFunction);
    this.pluginsTable.grantReadWriteData(pluginActivateFunction);
    this.pluginsTable.grantReadWriteData(pluginDeactivateFunction);
    this.pluginsTable.grantReadData(pluginListFunction);
    this.settingsTable.grantReadData(pluginGetSettingsFunction);
    this.settingsTable.grantReadWriteData(pluginUpdateSettingsFunction);
    this.pluginsTable.grantReadData(pluginGetSettingsFunction);

    // CloudWatch Monitoring and Alarms

    // Create SNS topic for alarm notifications
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `cms-alarms-${props.environment}`,
      displayName: `CMS Alarms - ${props.environment}`,
    });

    // Subscribe email to alarm topic if provided
    if (props.alarmEmail) {
      alarmTopic.addSubscription(
        new sns_subscriptions.EmailSubscription(props.alarmEmail)
      );
    }

    // Create alarm action
    const alarmAction = new cloudwatch_actions.SnsAction(alarmTopic);

    // Helper function to create alarms for a Lambda function
    const createLambdaAlarms = (fn: lambda.Function, functionLabel: string) => {
      // Error alarm - triggers when errors exceed threshold
      const errorAlarm = new cloudwatch.Alarm(this, `${functionLabel}ErrorAlarm`, {
        alarmName: `${fn.functionName}-errors`,
        alarmDescription: `Alert when ${functionLabel} errors exceed threshold`,
        metric: fn.metricErrors({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      errorAlarm.addAlarmAction(alarmAction);

      // Duration alarm - triggers when execution time is too long
      const durationAlarm = new cloudwatch.Alarm(this, `${functionLabel}DurationAlarm`, {
        alarmName: `${fn.functionName}-duration`,
        alarmDescription: `Alert when ${functionLabel} duration exceeds threshold`,
        metric: fn.metricDuration({
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
        threshold: fn.timeout ? fn.timeout.toMilliseconds() * 0.8 : 24000, // 80% of timeout
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      durationAlarm.addAlarmAction(alarmAction);

      // Throttle alarm - triggers when function is throttled
      const throttleAlarm = new cloudwatch.Alarm(this, `${functionLabel}ThrottleAlarm`, {
        alarmName: `${fn.functionName}-throttles`,
        alarmDescription: `Alert when ${functionLabel} is throttled`,
        metric: fn.metricThrottles({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      throttleAlarm.addAlarmAction(alarmAction);
    };

    // Create alarms for all Lambda functions
    createLambdaAlarms(this.schedulerFunction, 'Scheduler');
    createLambdaAlarms(contentCreateFunction, 'ContentCreate');
    createLambdaAlarms(contentGetFunction, 'ContentGet');
    createLambdaAlarms(contentListFunction, 'ContentList');
    createLambdaAlarms(contentUpdateFunction, 'ContentUpdate');
    createLambdaAlarms(contentDeleteFunction, 'ContentDelete');
    createLambdaAlarms(mediaUploadFunction, 'MediaUpload');
    createLambdaAlarms(mediaGetFunction, 'MediaGet');
    createLambdaAlarms(mediaListFunction, 'MediaList');
    createLambdaAlarms(mediaDeleteFunction, 'MediaDelete');
    createLambdaAlarms(userGetMeFunction, 'UserGetMe');
    createLambdaAlarms(userUpdateMeFunction, 'UserUpdateMe');
    createLambdaAlarms(userListFunction, 'UserList');
    createLambdaAlarms(settingsGetFunction, 'SettingsGet');
    createLambdaAlarms(settingsUpdateFunction, 'SettingsUpdate');
    createLambdaAlarms(pluginInstallFunction, 'PluginInstall');
    createLambdaAlarms(pluginActivateFunction, 'PluginActivate');
    createLambdaAlarms(pluginDeactivateFunction, 'PluginDeactivate');
    createLambdaAlarms(pluginListFunction, 'PluginList');
    createLambdaAlarms(pluginGetSettingsFunction, 'PluginGetSettings');
    createLambdaAlarms(pluginUpdateSettingsFunction, 'PluginUpdateSettings');

    // API Gateway alarms
    const api4xxErrorAlarm = new cloudwatch.Alarm(this, 'Api4xxErrorAlarm', {
      alarmName: `${this.api.restApiName}-4xx-errors`,
      alarmDescription: 'Alert when API Gateway 4xx errors exceed threshold',
      metric: this.api.metricClientError({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 50,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    api4xxErrorAlarm.addAlarmAction(alarmAction);

    const api5xxErrorAlarm = new cloudwatch.Alarm(this, 'Api5xxErrorAlarm', {
      alarmName: `${this.api.restApiName}-5xx-errors`,
      alarmDescription: 'Alert when API Gateway 5xx errors exceed threshold',
      metric: this.api.metricServerError({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    api5xxErrorAlarm.addAlarmAction(alarmAction);

    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      alarmName: `${this.api.restApiName}-latency`,
      alarmDescription: 'Alert when API Gateway latency is high',
      metric: this.api.metricLatency({
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5000, // 5 seconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    apiLatencyAlarm.addAlarmAction(alarmAction);

    // DynamoDB alarms for content table (most critical)
    const contentTableReadThrottleAlarm = new cloudwatch.Alarm(this, 'ContentTableReadThrottleAlarm', {
      alarmName: `${this.contentTable.tableName}-read-throttles`,
      alarmDescription: 'Alert when content table read requests are throttled',
      metric: this.contentTable.metricUserErrors({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    contentTableReadThrottleAlarm.addAlarmAction(alarmAction);

    const contentTableSystemErrorsAlarm = new cloudwatch.Alarm(this, 'ContentTableSystemErrorsAlarm', {
      alarmName: `${this.contentTable.tableName}-system-errors`,
      alarmDescription: 'Alert when content table has system errors',
      metric: this.contentTable.metricSystemErrorsForOperations({
        operations: [dynamodb.Operation.GET_ITEM, dynamodb.Operation.PUT_ITEM, dynamodb.Operation.QUERY],
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    contentTableSystemErrorsAlarm.addAlarmAction(alarmAction);

    // API Gateway Resources and Methods

    // /api/v1 base path
    const apiV1 = this.api.root.addResource('api').addResource('v1');

    // Content endpoints: /api/v1/content
    const contentResource = apiV1.addResource('content');
    
    // POST /api/v1/content - Create content (requires auth)
    contentResource.addMethod('POST', new apigateway.LambdaIntegration(contentCreateFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /api/v1/content - List content (public)
    contentResource.addMethod('GET', new apigateway.LambdaIntegration(contentListFunction));

    // GET /api/v1/content/{id} - Get content by ID (public for published, auth for drafts)
    const contentIdResource = contentResource.addResource('{id}');
    contentIdResource.addMethod('GET', new apigateway.LambdaIntegration(contentGetFunction));

    // PUT /api/v1/content/{id} - Update content (requires auth)
    contentIdResource.addMethod('PUT', new apigateway.LambdaIntegration(contentUpdateFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // DELETE /api/v1/content/{id} - Delete content (requires auth)
    contentIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(contentDeleteFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /api/v1/content/slug/{slug} - Get content by slug (public)
    const contentSlugResource = contentResource.addResource('slug').addResource('{slug}');
    contentSlugResource.addMethod('GET', new apigateway.LambdaIntegration(contentGetFunction));

    // Media endpoints: /api/v1/media
    const mediaResource = apiV1.addResource('media');

    // POST /api/v1/media/upload - Upload media (requires auth)
    const mediaUploadResource = mediaResource.addResource('upload');
    mediaUploadResource.addMethod('POST', new apigateway.LambdaIntegration(mediaUploadFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /api/v1/media - List media (requires auth)
    mediaResource.addMethod('GET', new apigateway.LambdaIntegration(mediaListFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /api/v1/media/{id} - Get media by ID (requires auth)
    const mediaIdResource = mediaResource.addResource('{id}');
    mediaIdResource.addMethod('GET', new apigateway.LambdaIntegration(mediaGetFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // DELETE /api/v1/media/{id} - Delete media (requires auth)
    mediaIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(mediaDeleteFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // User endpoints: /api/v1/users
    const usersResource = apiV1.addResource('users');

    // GET /api/v1/users/me - Get current user (requires auth)
    const usersMeResource = usersResource.addResource('me');
    usersMeResource.addMethod('GET', new apigateway.LambdaIntegration(userGetMeFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // PUT /api/v1/users/me - Update current user (requires auth)
    usersMeResource.addMethod('PUT', new apigateway.LambdaIntegration(userUpdateMeFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /api/v1/users - List users (requires auth)
    usersResource.addMethod('GET', new apigateway.LambdaIntegration(userListFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Settings endpoints: /api/v1/settings
    const settingsResource = apiV1.addResource('settings');

    // GET /api/v1/settings - Get settings (public)
    settingsResource.addMethod('GET', new apigateway.LambdaIntegration(settingsGetFunction));

    // PUT /api/v1/settings - Update settings (requires auth)
    settingsResource.addMethod('PUT', new apigateway.LambdaIntegration(settingsUpdateFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Plugin endpoints: /api/v1/plugins
    const pluginsResource = apiV1.addResource('plugins');

    // POST /api/v1/plugins/install - Install plugin (requires auth)
    const pluginInstallResource = pluginsResource.addResource('install');
    pluginInstallResource.addMethod('POST', new apigateway.LambdaIntegration(pluginInstallFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /api/v1/plugins - List plugins (requires auth)
    pluginsResource.addMethod('GET', new apigateway.LambdaIntegration(pluginListFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /api/v1/plugins/{id}/activate - Activate plugin (requires auth)
    const pluginIdResource = pluginsResource.addResource('{id}');
    const pluginActivateResource = pluginIdResource.addResource('activate');
    pluginActivateResource.addMethod('POST', new apigateway.LambdaIntegration(pluginActivateFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /api/v1/plugins/{id}/deactivate - Deactivate plugin (requires auth)
    const pluginDeactivateResource = pluginIdResource.addResource('deactivate');
    pluginDeactivateResource.addMethod('POST', new apigateway.LambdaIntegration(pluginDeactivateFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /api/v1/plugins/{id}/settings - Get plugin settings (requires auth)
    const pluginSettingsResource = pluginIdResource.addResource('settings');
    pluginSettingsResource.addMethod('GET', new apigateway.LambdaIntegration(pluginGetSettingsFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // PUT /api/v1/plugins/{id}/settings - Update plugin settings (requires auth)
    pluginSettingsResource.addMethod('PUT', new apigateway.LambdaIntegration(pluginUpdateSettingsFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Custom Domain and SSL Configuration (optional)
    if (props.domainName) {
      // Lookup existing hosted zone
      this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: props.domainName,
      });

      // Create ACM certificate in us-east-1 (required for CloudFront)
      this.certificate = new acm.Certificate(this, 'Certificate', {
        domainName: props.domainName,
        subjectAlternativeNames: [`*.${props.domainName}`],
        validation: acm.CertificateValidation.fromDns(this.hostedZone),
      });
    }

    // CloudFront Distributions

    // Origin Access Identity for S3 buckets (deprecated but still works)
    // Using Origin Access Control (OAC) is recommended but requires additional setup
    const adminOai = new cloudfront.OriginAccessIdentity(this, 'AdminOAI', {
      comment: `OAI for admin bucket ${props.environment}`,
    });

    const publicOai = new cloudfront.OriginAccessIdentity(this, 'PublicOAI', {
      comment: `OAI for public bucket ${props.environment}`,
    });

    // Grant CloudFront access to S3 buckets
    this.adminBucket.grantRead(adminOai);
    this.publicBucket.grantRead(publicOai);

    // Cache policy for static assets (HTML, CSS, JS, images)
    const staticAssetsCachePolicy = new cloudfront.CachePolicy(this, 'StaticAssetsCachePolicy', {
      cachePolicyName: `cms-static-assets-v2-${props.environment}`,
      comment: 'Cache policy for static assets with long TTL',
      defaultTtl: cdk.Duration.days(7),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.seconds(0),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // Cache policy for API endpoints (no caching)
    // Note: When caching is disabled (TTL=0), cookieBehavior and queryStringBehavior must be 'none'
    // All forwarding is handled by OriginRequestPolicy
    const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: `cms-api-no-cache-v2-${props.environment}`,
      comment: 'No caching for API endpoints',
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(0),
      minTtl: cdk.Duration.seconds(0),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      enableAcceptEncodingGzip: false,
      enableAcceptEncodingBrotli: false,
    });

    // Origin request policy for API to forward headers (except Authorization)
    // Note: Authorization cannot be in OriginRequestPolicy per AWS CDK rules
    const apiOriginRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'ApiOriginRequestPolicy', {
      originRequestPolicyName: `cms-api-origin-v2-${props.environment}`,
      comment: 'Forward all headers and query strings to API',
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
        'Content-Type',
        'Accept',
        'Origin',
        'Referer',
        'User-Agent',
        'CloudFront-Viewer-Country'
      ),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
    });

    // Response headers policy for security headers only (no CORS headers)
    // Note: CORS headers cannot be set as custom headers in CloudFront
    // CORS should be handled by API Gateway or origin server
    const securityHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
      responseHeadersPolicyName: `cms-security-headers-v2-${props.environment}`,
      comment: 'Security headers for CMS',
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.days(365),
          includeSubdomains: true,
          override: true,
        },
        xssProtection: { protection: true, modeBlock: true, override: true },
      },
    });

    // Admin Panel CloudFront Distribution
    this.adminDistribution = new cloudfront.Distribution(this, 'AdminDistribution', {
      comment: `CMS Admin Panel Distribution - ${props.environment}`,
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      domainNames: props.domainName ? [`admin.${props.domainName}`] : undefined,
      certificate: this.certificate,
      
      defaultBehavior: {
        origin: new origins.S3Origin(this.adminBucket, {
          originAccessIdentity: adminOai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: staticAssetsCachePolicy,
        responseHeadersPolicy: securityHeadersPolicy,
        compress: true,
      },

      additionalBehaviors: {
        // API endpoints - no caching
        '/api/*': {
          origin: new origins.RestApiOrigin(this.api, {
            originPath: `/${props.environment}`,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: apiCachePolicy,
          originRequestPolicy: apiOriginRequestPolicy,
          responseHeadersPolicy: securityHeadersPolicy,
          compress: false,
        },
      },

      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // Public Website CloudFront Distribution
    this.publicDistribution = new cloudfront.Distribution(this, 'PublicDistribution', {
      comment: `CMS Public Website Distribution - ${props.environment}`,
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      domainNames: props.domainName ? [props.domainName, `www.${props.domainName}`] : undefined,
      certificate: this.certificate,
      
      defaultBehavior: {
        origin: new origins.S3Origin(this.publicBucket, {
          originAccessIdentity: publicOai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: staticAssetsCachePolicy,
        responseHeadersPolicy: securityHeadersPolicy,
        compress: true,
      },

      additionalBehaviors: {
        // API endpoints - no caching
        '/api/*': {
          origin: new origins.RestApiOrigin(this.api, {
            originPath: `/${props.environment}`,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: apiCachePolicy,
          originRequestPolicy: apiOriginRequestPolicy,
          responseHeadersPolicy: securityHeadersPolicy,
          compress: false,
        },
      },

      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // Create Route53 DNS records if custom domain is configured
    if (props.domainName && this.hostedZone) {
      // Admin subdomain A record
      new route53.ARecord(this, 'AdminAliasRecord', {
        zone: this.hostedZone,
        recordName: `admin.${props.domainName}`,
        target: route53.RecordTarget.fromAlias(
          new route53targets.CloudFrontTarget(this.adminDistribution)
        ),
      });

      // Public website root domain A record
      new route53.ARecord(this, 'PublicAliasRecord', {
        zone: this.hostedZone,
        recordName: props.domainName,
        target: route53.RecordTarget.fromAlias(
          new route53targets.CloudFrontTarget(this.publicDistribution)
        ),
      });

      // Public website www subdomain A record
      new route53.ARecord(this, 'PublicWwwAliasRecord', {
        zone: this.hostedZone,
        recordName: `www.${props.domainName}`,
        target: route53.RecordTarget.fromAlias(
          new route53targets.CloudFrontTarget(this.publicDistribution)
        ),
      });
    }

    // Outputs
    new cdk.CfnOutput(this, 'Environment', {
      value: props.environment,
      description: 'Deployment environment',
    });

    new cdk.CfnOutput(this, 'ContentTableName', {
      value: this.contentTable.tableName,
      description: 'Content table name',
    });

    new cdk.CfnOutput(this, 'MediaTableName', {
      value: this.mediaTable.tableName,
      description: 'Media table name',
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
      description: 'Users table name',
    });

    new cdk.CfnOutput(this, 'SettingsTableName', {
      value: this.settingsTable.tableName,
      description: 'Settings table name',
    });

    new cdk.CfnOutput(this, 'PluginsTableName', {
      value: this.pluginsTable.tableName,
      description: 'Plugins table name',
    });

    new cdk.CfnOutput(this, 'MediaBucketName', {
      value: this.mediaBucket.bucketName,
      description: 'Media bucket name',
    });

    new cdk.CfnOutput(this, 'AdminBucketName', {
      value: this.adminBucket.bucketName,
      description: 'Admin panel bucket name',
    });

    new cdk.CfnOutput(this, 'AdminBucketWebsiteUrl', {
      value: this.adminBucket.bucketWebsiteUrl,
      description: 'Admin panel website URL',
    });

    new cdk.CfnOutput(this, 'PublicBucketName', {
      value: this.publicBucket.bucketName,
      description: 'Public website bucket name',
    });

    new cdk.CfnOutput(this, 'PublicBucketWebsiteUrl', {
      value: this.publicBucket.bucketWebsiteUrl,
      description: 'Public website URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
    });

    new cdk.CfnOutput(this, 'SchedulerFunctionName', {
      value: this.schedulerFunction.functionName,
      description: 'Scheduler Lambda function name',
    });

    new cdk.CfnOutput(this, 'SchedulerFunctionArn', {
      value: this.schedulerFunction.functionArn,
      description: 'Scheduler Lambda function ARN',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: `${this.api.url}api/v1`,
      description: 'API Gateway v1 endpoint',
    });

    new cdk.CfnOutput(this, 'AdminDistributionId', {
      value: this.adminDistribution.distributionId,
      description: 'Admin CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'AdminDistributionDomainName', {
      value: this.adminDistribution.distributionDomainName,
      description: 'Admin CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'AdminUrl', {
      value: `https://${this.adminDistribution.distributionDomainName}`,
      description: 'Admin Panel URL',
    });

    new cdk.CfnOutput(this, 'PublicDistributionId', {
      value: this.publicDistribution.distributionId,
      description: 'Public CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'PublicDistributionDomainName', {
      value: this.publicDistribution.distributionDomainName,
      description: 'Public CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'PublicUrl', {
      value: `https://${this.publicDistribution.distributionDomainName}`,
      description: 'Public Website URL',
    });

    // Custom domain outputs (if configured)
    if (props.domainName) {
      new cdk.CfnOutput(this, 'DomainName', {
        value: props.domainName,
        description: 'Custom domain name',
      });

      new cdk.CfnOutput(this, 'AdminCustomUrl', {
        value: `https://admin.${props.domainName}`,
        description: 'Admin Panel Custom Domain URL',
      });

      new cdk.CfnOutput(this, 'PublicCustomUrl', {
        value: `https://${props.domainName}`,
        description: 'Public Website Custom Domain URL',
      });

      if (this.certificate) {
        new cdk.CfnOutput(this, 'CertificateArn', {
          value: this.certificate.certificateArn,
          description: 'ACM Certificate ARN',
        });
      }

      if (this.hostedZone) {
        new cdk.CfnOutput(this, 'HostedZoneId', {
          value: this.hostedZone.hostedZoneId,
          description: 'Route53 Hosted Zone ID',
        });
      }
    }

    // Monitoring outputs
    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: alarmTopic.topicArn,
      description: 'SNS Topic ARN for CloudWatch Alarms',
    });

    new cdk.CfnOutput(this, 'AlarmTopicName', {
      value: alarmTopic.topicName,
      description: 'SNS Topic Name for CloudWatch Alarms',
    });
  }
}
