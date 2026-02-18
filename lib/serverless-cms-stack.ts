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
import * as ses from 'aws-cdk-lib/aws-ses';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface ServerlessCmsStackProps extends cdk.StackProps {
  environment: string;
  domainName?: string;
  subdomain?: string;
  alarmEmail?: string; // Email address for alarm notifications
  sesFromEmail?: string; // Email address for sending emails (e.g., no-reply@celestium.life)
}

export class ServerlessCmsStack extends cdk.Stack {
  public readonly contentTable: dynamodb.ITable;
  public readonly mediaTable: dynamodb.ITable;
  public readonly usersTable: dynamodb.ITable;
  public readonly settingsTable: dynamodb.ITable;
  public readonly pluginsTable: dynamodb.ITable;
  public readonly commentsTable: dynamodb.Table;
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
    // Create DynamoDB Tables
    
    // Content Table
    this.contentTable = new dynamodb.Table(this, 'ContentTable', {
      tableName: `cms-content-${props.environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    (this.contentTable as dynamodb.Table).addGlobalSecondaryIndex({
      indexName: 'type-published_at-index',
      partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'published_at', type: dynamodb.AttributeType.NUMBER },
    });

    (this.contentTable as dynamodb.Table).addGlobalSecondaryIndex({
      indexName: 'status-published_at-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'published_at', type: dynamodb.AttributeType.NUMBER },
    });

    // Media Table
    this.mediaTable = new dynamodb.Table(this, 'MediaTable', {
      tableName: `cms-media-${props.environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uploaded_at', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Users Table
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `cms-users-${props.environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    (this.usersTable as dynamodb.Table).addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });

    // Settings Table
    this.settingsTable = new dynamodb.Table(this, 'SettingsTable', {
      tableName: `cms-settings-${props.environment}`,
      partitionKey: { name: 'key', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Plugins Table
    this.pluginsTable = new dynamodb.Table(this, 'PluginsTable', {
      tableName: `cms-plugins-${props.environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Comments Table - Create new table with GSIs
    this.commentsTable = new dynamodb.Table(this, 'CommentsTable', {
      tableName: `cms-comments-${props.environment}`,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'created_at',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // GSI for querying comments by content_id
    this.commentsTable.addGlobalSecondaryIndex({
      indexName: 'content_id-created_at-index',
      partitionKey: {
        name: 'content_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'created_at',
        type: dynamodb.AttributeType.NUMBER,
      },
    });

    // GSI for querying comments by status (for moderation)
    this.commentsTable.addGlobalSecondaryIndex({
      indexName: 'status-created_at-index',
      partitionKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'created_at',
        type: dynamodb.AttributeType.NUMBER,
      },
    });

    // S3 Buckets
    // Note: Using RETAIN removal policy to prevent accidental deletion
    // Using account ID for stable bucket names across deployments

    // Media Bucket - for uploaded files and generated thumbnails
    this.mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: `serverless-cms-media-${props.environment}-${this.account}`,
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
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Admin Panel Bucket - for hosting the React admin application
    this.adminBucket = new s3.Bucket(this, 'AdminBucket', {
      bucketName: `serverless-cms-admin-${props.environment}-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA routing support
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
    });

    // Public Website Bucket - for hosting the React public website
    this.publicBucket = new s3.Bucket(this, 'PublicBucket', {
      bucketName: `serverless-cms-public-${props.environment}-${this.account}`,
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
      binaryMediaTypes: ['multipart/form-data', 'image/*', 'application/octet-stream'],
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
    // Layer structure: lambda/layer/python/shared/
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('lambda/layer'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
      description: 'Shared utilities for CMS Lambda functions',
    });

    // AWS SES Configuration for email sending
    const sesEmailPrefix = props.environment === 'prod' ? 'no-reply' : `${props.environment}-no-reply`;
    const sesFromEmail = props.sesFromEmail || `${sesEmailPrefix}@celestium.life`;
    
    // Create SES email identity
    const emailIdentity = new ses.EmailIdentity(this, 'SesEmailIdentity', {
      identity: ses.Identity.email(sesFromEmail),
      mailFromDomain: props.domainName ? `mail.${props.domainName}` : undefined,
    });

    // Create SNS topics for SES bounce and complaint handling
    const sesBouncesTopic = new sns.Topic(this, 'SesBouncesTopic', {
      topicName: `cms-ses-bounces-${props.environment}`,
      displayName: `CMS SES Bounces - ${props.environment}`,
    });

    const sesComplaintsTopic = new sns.Topic(this, 'SesComplaintsTopic', {
      topicName: `cms-ses-complaints-${props.environment}`,
      displayName: `CMS SES Complaints - ${props.environment}`,
    });

    // Subscribe alarm email to bounce/complaint topics if provided
    if (props.alarmEmail) {
      sesBouncesTopic.addSubscription(
        new sns_subscriptions.EmailSubscription(props.alarmEmail)
      );
      sesComplaintsTopic.addSubscription(
        new sns_subscriptions.EmailSubscription(props.alarmEmail)
      );
    }

    // Create configuration set for tracking bounces and complaints
    const sesConfigurationSet = new ses.ConfigurationSet(this, 'SesConfigurationSet', {
      configurationSetName: `cms-emails-${props.environment}`,
    });

    // Add event destinations for bounces and complaints
    sesConfigurationSet.addEventDestination('BounceDestination', {
      destination: ses.EventDestination.snsTopic(sesBouncesTopic),
      events: [ses.EmailSendingEvent.BOUNCE],
      enabled: true,
    });

    sesConfigurationSet.addEventDestination('ComplaintDestination', {
      destination: ses.EventDestination.snsTopic(sesComplaintsTopic),
      events: [ses.EmailSendingEvent.COMPLAINT],
      enabled: true,
    });

    // Common environment variables for Lambda functions
    const commonEnv = {
      CONTENT_TABLE: this.contentTable.tableName,
      MEDIA_TABLE: this.mediaTable.tableName,
      USERS_TABLE: this.usersTable.tableName,
      SETTINGS_TABLE: this.settingsTable.tableName,
      PLUGINS_TABLE: this.pluginsTable.tableName,
      COMMENTS_TABLE: this.commentsTable.tableName,
      MEDIA_BUCKET: this.mediaBucket.bucketName,
      COGNITO_REGION: this.region,
      USER_POOL_ID: this.userPool.userPoolId,
      USER_POOL_CLIENT_ID: this.userPoolClient.userPoolClientId,
      ENVIRONMENT: props.environment,
      SES_FROM_EMAIL: sesFromEmail,
      SES_CONFIGURATION_SET: sesConfigurationSet.configurationSetName,
      SES_REGION: this.region,
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
    
    // Grant explicit GSI query permissions
    contentCreateFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Query'],
      resources: [`${this.contentTable.tableArn}/index/*`],
    }));
    contentGetFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Query'],
      resources: [`${this.contentTable.tableArn}/index/*`],
    }));
    contentListFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Query'],
      resources: [`${this.contentTable.tableArn}/index/*`],
    }));
    
    this.pluginsTable.grantReadData(contentCreateFunction);
    this.pluginsTable.grantReadData(contentGetFunction);
    this.pluginsTable.grantReadData(contentUpdateFunction);
    this.pluginsTable.grantReadData(contentDeleteFunction);
    this.usersTable.grantReadData(contentCreateFunction);
    this.usersTable.grantReadWriteData(contentCreateFunction); // Need write for auto-creating users
    this.usersTable.grantReadData(contentGetFunction); // Need read for author enrichment
    this.usersTable.grantReadData(contentListFunction); // Need read for author enrichment
    this.usersTable.grantReadData(contentUpdateFunction);
    this.usersTable.grantReadData(contentDeleteFunction);
    
    // Grant Cognito permissions for user auto-creation
    contentCreateFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cognito-idp:AdminGetUser'],
      resources: [this.userPool.userPoolArn],
    }));

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
    this.usersTable.grantReadData(mediaUploadFunction);
    this.usersTable.grantReadData(mediaDeleteFunction);

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

    // User Management Lambda Functions (Admin operations)
    const userCreateFunction = new lambda.Function(this, 'UserCreateFunction', {
      functionName: `cms-user-create-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'create.handler',
      code: lambda.Code.fromAsset('lambda/users'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const userUpdateFunction = new lambda.Function(this, 'UserUpdateFunction', {
      functionName: `cms-user-update-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'update.handler',
      code: lambda.Code.fromAsset('lambda/users'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const userDeleteFunction = new lambda.Function(this, 'UserDeleteFunction', {
      functionName: `cms-user-delete-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'delete.handler',
      code: lambda.Code.fromAsset('lambda/users'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const userResetPasswordFunction = new lambda.Function(this, 'UserResetPasswordFunction', {
      functionName: `cms-user-reset-password-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'reset_password.handler',
      code: lambda.Code.fromAsset('lambda/users'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    // Grant permissions to user functions
    this.usersTable.grantReadWriteData(userGetMeFunction); // Need write for last_login update
    this.usersTable.grantReadWriteData(userUpdateMeFunction);
    this.usersTable.grantReadData(userListFunction);
    this.usersTable.grantReadWriteData(userCreateFunction);
    this.usersTable.grantReadWriteData(userUpdateFunction);
    this.usersTable.grantReadWriteData(userDeleteFunction);
    this.usersTable.grantReadData(userResetPasswordFunction);
    
    // Grant Cognito permissions for user profile sync
    userGetMeFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cognito-idp:AdminGetUser'],
      resources: [this.userPool.userPoolArn],
    }));
    
    userUpdateMeFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cognito-idp:AdminGetUser', 'cognito-idp:AdminUpdateUserAttributes'],
      resources: [this.userPool.userPoolArn],
    }));

    // Grant Cognito admin permissions for user management functions
    userCreateFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminSetUserPassword',
        'cognito-idp:AdminUpdateUserAttributes',
      ],
      resources: [this.userPool.userPoolArn],
    }));

    userUpdateFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:AdminGetUser',
        'cognito-idp:AdminUpdateUserAttributes',
      ],
      resources: [this.userPool.userPoolArn],
    }));

    userDeleteFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:AdminGetUser',
        'cognito-idp:AdminDeleteUser',
      ],
      resources: [this.userPool.userPoolArn],
    }));

    userResetPasswordFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:AdminGetUser',
        'cognito-idp:AdminResetUserPassword',
      ],
      resources: [this.userPool.userPoolArn],
    }));

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

    const settingsGetPublicFunction = new lambda.Function(this, 'SettingsGetPublicFunction', {
      functionName: `cms-settings-get-public-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'get_public.handler',
      code: lambda.Code.fromAsset('lambda/settings'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    // Grant permissions to settings functions
    this.settingsTable.grantReadData(settingsGetFunction);
    this.settingsTable.grantReadWriteData(settingsUpdateFunction);
    this.settingsTable.grantReadData(settingsGetPublicFunction);
    
    // Grant users table read access for auth (role checking)
    this.usersTable.grantReadData(settingsGetFunction);
    this.usersTable.grantReadData(settingsUpdateFunction);

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

    // Comment Lambda Functions
    const commentListFunction = new lambda.Function(this, 'CommentListFunction', {
      functionName: `cms-comment-list-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'list.handler',
      code: lambda.Code.fromAsset('lambda/comments'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const commentCreateFunction = new lambda.Function(this, 'CommentCreateFunction', {
      functionName: `cms-comment-create-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'create.handler',
      code: lambda.Code.fromAsset('lambda/comments'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const commentUpdateFunction = new lambda.Function(this, 'CommentUpdateFunction', {
      functionName: `cms-comment-update-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'update.handler',
      code: lambda.Code.fromAsset('lambda/comments'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const commentDeleteFunction = new lambda.Function(this, 'CommentDeleteFunction', {
      functionName: `cms-comment-delete-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'delete.handler',
      code: lambda.Code.fromAsset('lambda/comments'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    // Grant permissions to comment functions
    this.commentsTable.grantReadData(commentListFunction);
    this.commentsTable.grantReadWriteData(commentCreateFunction);
    this.commentsTable.grantReadWriteData(commentUpdateFunction);
    this.commentsTable.grantReadWriteData(commentDeleteFunction);
    
    // Grant GSI query permissions for comments
    commentListFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:Query'],
      resources: [`${this.commentsTable.tableArn}/index/*`],
    }));
    
    // Comment create needs to verify content exists
    this.contentTable.grantReadData(commentCreateFunction);
    
    // Comment functions need to read settings
    this.settingsTable.grantReadData(commentCreateFunction);
    this.settingsTable.grantReadData(commentListFunction);
    this.settingsTable.grantReadData(commentUpdateFunction);
    this.settingsTable.grantReadData(commentDeleteFunction);
    
    // Comment update and delete need user info for authorization
    this.usersTable.grantReadData(commentUpdateFunction);
    this.usersTable.grantReadData(commentDeleteFunction);

    // Registration Lambda Functions
    const registerFunction = new lambda.Function(this, 'RegisterFunction', {
      functionName: `cms-register-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'register.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    const verifyEmailFunction = new lambda.Function(this, 'VerifyEmailFunction', {
      functionName: `cms-verify-email-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'verify_email.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      layers: [sharedLayer],
    });

    // Grant permissions to registration functions
    this.usersTable.grantReadWriteData(registerFunction);
    this.usersTable.grantReadData(verifyEmailFunction);
    
    // Grant Cognito permissions for user creation
    registerFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminSetUserPassword',
        'cognito-idp:AdminUpdateUserAttributes',
        'cognito-idp:ListUsers',
      ],
      resources: [this.userPool.userPoolArn],
    }));
    
    verifyEmailFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:AdminConfirmSignUp',
        'cognito-idp:AdminUpdateUserAttributes',
      ],
      resources: [this.userPool.userPoolArn],
    }));
    
    // Grant SES permissions for sending welcome emails
    registerFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

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
    createLambdaAlarms(userCreateFunction, 'UserCreate');
    createLambdaAlarms(userUpdateFunction, 'UserUpdate');
    createLambdaAlarms(userDeleteFunction, 'UserDelete');
    createLambdaAlarms(userResetPasswordFunction, 'UserResetPassword');
    createLambdaAlarms(settingsGetFunction, 'SettingsGet');
    createLambdaAlarms(settingsUpdateFunction, 'SettingsUpdate');
    createLambdaAlarms(settingsGetPublicFunction, 'SettingsGetPublic');
    createLambdaAlarms(pluginInstallFunction, 'PluginInstall');
    createLambdaAlarms(pluginActivateFunction, 'PluginActivate');
    createLambdaAlarms(pluginDeactivateFunction, 'PluginDeactivate');
    createLambdaAlarms(pluginListFunction, 'PluginList');
    createLambdaAlarms(pluginGetSettingsFunction, 'PluginGetSettings');
    createLambdaAlarms(pluginUpdateSettingsFunction, 'PluginUpdateSettings');
    createLambdaAlarms(commentListFunction, 'CommentList');
    createLambdaAlarms(commentCreateFunction, 'CommentCreate');
    createLambdaAlarms(commentUpdateFunction, 'CommentUpdate');
    createLambdaAlarms(commentDeleteFunction, 'CommentDelete');
    createLambdaAlarms(registerFunction, 'Register');
    createLambdaAlarms(verifyEmailFunction, 'VerifyEmail');

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

    // Phase 2 Alarms - Email, CAPTCHA, Comments, User Management

    // SES Bounce Rate Alarm
    const sesBounceRateAlarm = new cloudwatch.Alarm(this, 'SesBounceRateAlarm', {
      alarmName: `cms-ses-bounce-rate-${props.environment}`,
      alarmDescription: 'Alert when SES bounce rate exceeds 5%',
      metric: new cloudwatch.MathExpression({
        expression: '(bounces / sends) * 100',
        usingMetrics: {
          bounces: new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Reputation.BounceRate',
            statistic: 'Average',
            period: cdk.Duration.minutes(15),
          }),
          sends: new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Send',
            statistic: 'Sum',
            period: cdk.Duration.minutes(15),
          }),
        },
      }),
      threshold: 5, // 5% bounce rate
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    sesBounceRateAlarm.addAlarmAction(alarmAction);

    // SES Complaint Rate Alarm
    const sesComplaintRateAlarm = new cloudwatch.Alarm(this, 'SesComplaintRateAlarm', {
      alarmName: `cms-ses-complaint-rate-${props.environment}`,
      alarmDescription: 'Alert when SES complaint rate exceeds 0.1%',
      metric: new cloudwatch.MathExpression({
        expression: '(complaints / sends) * 100',
        usingMetrics: {
          complaints: new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Reputation.ComplaintRate',
            statistic: 'Average',
            period: cdk.Duration.minutes(15),
          }),
          sends: new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Send',
            statistic: 'Sum',
            period: cdk.Duration.minutes(15),
          }),
        },
      }),
      threshold: 0.1, // 0.1% complaint rate
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    sesComplaintRateAlarm.addAlarmAction(alarmAction);

    // User Creation Failure Alarm (monitors userCreateFunction errors)
    const userCreationFailureAlarm = new cloudwatch.Alarm(this, 'UserCreationFailureAlarm', {
      alarmName: `cms-user-creation-failures-${props.environment}`,
      alarmDescription: 'Alert when user creation failures exceed threshold',
      metric: userCreateFunction.metricErrors({
        statistic: 'Sum',
        period: cdk.Duration.minutes(15),
      }),
      threshold: 3,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    userCreationFailureAlarm.addAlarmAction(alarmAction);

    // Comment Spam Detection Rate Alarm (monitors rejected/spam comments)
    // This uses a custom metric that should be logged by the comment moderation Lambda
    const commentSpamRateAlarm = new cloudwatch.Alarm(this, 'CommentSpamRateAlarm', {
      alarmName: `cms-comment-spam-rate-${props.environment}`,
      alarmDescription: 'Alert when comment spam detection rate is high',
      metric: new cloudwatch.Metric({
        namespace: 'ServerlessCMS',
        metricName: 'CommentSpamDetected',
        statistic: 'Sum',
        period: cdk.Duration.hours(1),
      }),
      threshold: 20, // More than 20 spam comments per hour
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    commentSpamRateAlarm.addAlarmAction(alarmAction);

    // CAPTCHA Validation Failure Alarm
    // This monitors failed CAPTCHA validations which could indicate bot attacks
    const captchaFailureAlarm = new cloudwatch.Alarm(this, 'CaptchaFailureAlarm', {
      alarmName: `cms-captcha-failures-${props.environment}`,
      alarmDescription: 'Alert when CAPTCHA validation failures exceed threshold',
      metric: new cloudwatch.Metric({
        namespace: 'ServerlessCMS',
        metricName: 'CaptchaValidationFailed',
        statistic: 'Sum',
        period: cdk.Duration.minutes(15),
      }),
      threshold: 50, // More than 50 failed CAPTCHAs in 15 minutes
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    captchaFailureAlarm.addAlarmAction(alarmAction);

    // Registration Failure Alarm
    const registrationFailureAlarm = new cloudwatch.Alarm(this, 'RegistrationFailureAlarm', {
      alarmName: `cms-registration-failures-${props.environment}`,
      alarmDescription: 'Alert when user registration failures exceed threshold',
      metric: registerFunction.metricErrors({
        statistic: 'Sum',
        period: cdk.Duration.minutes(15),
      }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    registrationFailureAlarm.addAlarmAction(alarmAction);

    // CloudWatch Dashboard for Phase 2 Metrics
    const phase2Dashboard = new cloudwatch.Dashboard(this, 'Phase2Dashboard', {
      dashboardName: `cms-phase2-${props.environment}`,
    });

    // Add widgets to dashboard
    phase2Dashboard.addWidgets(
      // User Management Metrics
      new cloudwatch.GraphWidget({
        title: 'User Management',
        left: [
          userCreateFunction.metricInvocations({ label: 'User Creates' }),
          userUpdateFunction.metricInvocations({ label: 'User Updates' }),
          userDeleteFunction.metricInvocations({ label: 'User Deletes' }),
          registerFunction.metricInvocations({ label: 'Registrations' }),
        ],
        right: [
          userCreateFunction.metricErrors({ label: 'Create Errors', color: cloudwatch.Color.RED }),
          registerFunction.metricErrors({ label: 'Registration Errors', color: cloudwatch.Color.ORANGE }),
        ],
        width: 12,
      }),
      
      // Comment System Metrics
      new cloudwatch.GraphWidget({
        title: 'Comment System',
        left: [
          commentCreateFunction.metricInvocations({ label: 'Comments Created' }),
          commentUpdateFunction.metricInvocations({ label: 'Comments Moderated' }),
          commentListFunction.metricInvocations({ label: 'Comment Views' }),
        ],
        right: [
          commentCreateFunction.metricErrors({ label: 'Create Errors', color: cloudwatch.Color.RED }),
          new cloudwatch.Metric({
            namespace: 'ServerlessCMS',
            metricName: 'CommentSpamDetected',
            statistic: 'Sum',
            label: 'Spam Detected',
            color: cloudwatch.Color.ORANGE,
          }),
        ],
        width: 12,
      })
    );

    phase2Dashboard.addWidgets(
      // Email Metrics
      new cloudwatch.GraphWidget({
        title: 'Email Delivery (SES)',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Send',
            statistic: 'Sum',
            label: 'Emails Sent',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Delivery',
            statistic: 'Sum',
            label: 'Delivered',
            color: cloudwatch.Color.GREEN,
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Bounce',
            statistic: 'Sum',
            label: 'Bounces',
            color: cloudwatch.Color.RED,
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Complaint',
            statistic: 'Sum',
            label: 'Complaints',
            color: cloudwatch.Color.ORANGE,
          }),
        ],
        width: 12,
      }),

      // CAPTCHA Metrics
      new cloudwatch.GraphWidget({
        title: 'CAPTCHA Protection',
        left: [
          new cloudwatch.Metric({
            namespace: 'ServerlessCMS',
            metricName: 'CaptchaValidationSuccess',
            statistic: 'Sum',
            label: 'Successful Validations',
            color: cloudwatch.Color.GREEN,
          }),
          new cloudwatch.Metric({
            namespace: 'ServerlessCMS',
            metricName: 'CaptchaValidationFailed',
            statistic: 'Sum',
            label: 'Failed Validations',
            color: cloudwatch.Color.RED,
          }),
        ],
        width: 12,
      })
    );

    phase2Dashboard.addWidgets(
      // Lambda Performance Overview
      new cloudwatch.GraphWidget({
        title: 'Phase 2 Lambda Duration',
        left: [
          userCreateFunction.metricDuration({ label: 'User Create', statistic: 'Average' }),
          registerFunction.metricDuration({ label: 'Registration', statistic: 'Average' }),
          commentCreateFunction.metricDuration({ label: 'Comment Create', statistic: 'Average' }),
          commentUpdateFunction.metricDuration({ label: 'Comment Moderate', statistic: 'Average' }),
        ],
        width: 12,
      }),

      // Comments Table Metrics
      new cloudwatch.GraphWidget({
        title: 'Comments Table Performance',
        left: [
          this.commentsTable.metricConsumedReadCapacityUnits({ label: 'Read Capacity' }),
          this.commentsTable.metricConsumedWriteCapacityUnits({ label: 'Write Capacity' }),
        ],
        right: [
          this.commentsTable.metricUserErrors({ label: 'User Errors', color: cloudwatch.Color.RED }),
          this.commentsTable.metricSystemErrorsForOperations({
            operations: [dynamodb.Operation.PUT_ITEM, dynamodb.Operation.QUERY],
            label: 'System Errors',
            color: cloudwatch.Color.ORANGE,
          }),
        ],
        width: 12,
      })
    );

    // Helper function to grant SES send email permissions to Lambda functions
    const grantSesSendEmail = (fn: lambda.Function) => {
      fn.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ses:SendEmail',
          'ses:SendRawEmail',
          'ses:SendTemplatedEmail',
        ],
        resources: ['*'], // SES doesn't support resource-level permissions for sending
      }));
    };

    // Grant SES send email permissions to user management functions
    grantSesSendEmail(userCreateFunction);
    grantSesSendEmail(userResetPasswordFunction);
    grantSesSendEmail(registerFunction);

    // Helper function to grant CloudWatch PutMetricData permissions
    const grantCloudWatchMetrics = (fn: lambda.Function) => {
      fn.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      }));
    };

    // Grant CloudWatch metrics permissions to Phase 2 functions
    grantCloudWatchMetrics(commentCreateFunction);
    grantCloudWatchMetrics(commentUpdateFunction);
    grantCloudWatchMetrics(userCreateFunction);
    grantCloudWatchMetrics(registerFunction);

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

    // POST /api/v1/users - Create user (requires admin auth)
    usersResource.addMethod('POST', new apigateway.LambdaIntegration(userCreateFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // User ID-specific endpoints: /api/v1/users/{id}
    const userIdResource = usersResource.addResource('{id}');

    // PUT /api/v1/users/{id} - Update user (requires admin auth)
    userIdResource.addMethod('PUT', new apigateway.LambdaIntegration(userUpdateFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // DELETE /api/v1/users/{id} - Delete user (requires admin auth)
    userIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(userDeleteFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /api/v1/users/{id}/reset-password - Reset user password (requires admin auth)
    const userResetPasswordResource = userIdResource.addResource('reset-password');
    userResetPasswordResource.addMethod('POST', new apigateway.LambdaIntegration(userResetPasswordFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Settings endpoints: /api/v1/settings
    const settingsResource = apiV1.addResource('settings');

    // GET /api/v1/settings - Get settings (requires auth for admin)
    settingsResource.addMethod('GET', new apigateway.LambdaIntegration(settingsGetFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // PUT /api/v1/settings - Update settings (requires auth)
    settingsResource.addMethod('PUT', new apigateway.LambdaIntegration(settingsUpdateFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /api/v1/settings/public - Get public settings (no auth required)
    const settingsPublicResource = settingsResource.addResource('public');
    settingsPublicResource.addMethod('GET', new apigateway.LambdaIntegration(settingsGetPublicFunction));

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

    // Comment endpoints: /api/v1/comments and /api/v1/content/{id}/comments
    
    // GET /api/v1/content/{id}/comments - List comments for content (public)
    const contentIdCommentsResource = contentIdResource.addResource('comments');
    contentIdCommentsResource.addMethod('GET', new apigateway.LambdaIntegration(commentListFunction));

    // POST /api/v1/content/{id}/comments - Create comment for content (public if enabled)
    contentIdCommentsResource.addMethod('POST', new apigateway.LambdaIntegration(commentCreateFunction));

    // GET /api/v1/comments - List all comments for moderation (requires editor+ auth)
    const commentsResource = apiV1.addResource('comments');
    commentsResource.addMethod('GET', new apigateway.LambdaIntegration(commentListFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // PUT /api/v1/comments/{id} - Update comment status (requires editor+ auth)
    const commentIdResource = commentsResource.addResource('{id}');
    commentIdResource.addMethod('PUT', new apigateway.LambdaIntegration(commentUpdateFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // DELETE /api/v1/comments/{id} - Delete comment (requires editor+ auth)
    commentIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(commentDeleteFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Auth/Registration endpoints: /api/v1/auth
    const authResource = apiV1.addResource('auth');

    // POST /api/v1/auth/register - Register new user (public if enabled)
    const registerResource = authResource.addResource('register');
    registerResource.addMethod('POST', new apigateway.LambdaIntegration(registerFunction));

    // POST /api/v1/auth/verify-email - Verify email address (public)
    const verifyEmailResource = authResource.addResource('verify-email');
    verifyEmailResource.addMethod('POST', new apigateway.LambdaIntegration(verifyEmailFunction));

    // AWS WAF Web ACL for API protection and CAPTCHA
    const webAcl = new wafv2.CfnWebACL(this, 'ApiWebAcl', {
      name: `cms-api-waf-${props.environment}`,
      description: 'WAF for CMS API with CAPTCHA protection on comment endpoints',
      scope: 'REGIONAL', // For API Gateway (use CLOUDFRONT for CloudFront distributions)
      defaultAction: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `cms-api-waf-${props.environment}`,
      },
      rules: [
        {
          name: 'RateLimitRule',
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: 2000, // 2000 requests per 5 minutes per IP
              aggregateKeyType: 'IP',
            },
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `cms-rate-limit-${props.environment}`,
          },
        },
        {
          name: 'CommentCaptchaRule',
          priority: 2,
          statement: {
            andStatement: {
              statements: [
                {
                  byteMatchStatement: {
                    searchString: '/api/v1/content/',
                    fieldToMatch: { uriPath: {} },
                    textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
                    positionalConstraint: 'STARTS_WITH',
                  },
                },
                {
                  byteMatchStatement: {
                    searchString: '/comments',
                    fieldToMatch: { uriPath: {} },
                    textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
                    positionalConstraint: 'ENDS_WITH',
                  },
                },
                {
                  byteMatchStatement: {
                    searchString: 'POST',
                    fieldToMatch: { method: {} },
                    textTransformations: [{ priority: 0, type: 'NONE' }],
                    positionalConstraint: 'EXACTLY',
                  },
                },
              ],
            },
          },
          action: {
            captcha: {
              customRequestHandling: {
                insertHeaders: [
                  {
                    name: 'x-captcha-verified',
                    value: 'true',
                  },
                ],
              },
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `cms-comment-captcha-${props.environment}`,
          },
          captchaConfig: {
            immunityTimeProperty: {
              immunityTime: 300, // 5 minutes immunity after solving CAPTCHA
            },
          },
        },
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 3,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
              excludedRules: [
                { name: 'SizeRestrictions_BODY' }, // Allow larger request bodies for content
                { name: 'GenericRFI_BODY' }, // Can cause false positives with user content
              ],
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `cms-aws-common-rules-${props.environment}`,
          },
        },
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 4,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `cms-aws-bad-inputs-${props.environment}`,
          },
        },
      ],
    });

    // Associate WAF with API Gateway
    const webAclAssociation = new wafv2.CfnWebACLAssociation(this, 'ApiWebAclAssociation', {
      resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${this.api.restApiId}/stages/${props.environment}`,
      webAclArn: webAcl.attrArn,
    });

    // Ensure WAF is created before association
    webAclAssociation.node.addDependency(webAcl);
    webAclAssociation.node.addDependency(this.api);

    // Custom Domain and SSL Configuration (optional)
    if (props.domainName) {
      // Extract root domain for hosted zone lookup (e.g., celestium.life from serverless.celestium.life)
      const domainParts = props.domainName.split('.');
      const rootDomain = domainParts.slice(-2).join('.'); // Get last two parts (e.g., celestium.life)
      
      // Lookup existing hosted zone
      this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: rootDomain,
      });

      // Create ACM certificate in us-east-1 (required for CloudFront)
      // Build list of all domains the certificate needs to cover
      const certDomains: string[] = [];
      
      if (props.subdomain) {
        // For dev/staging environments:
        // - dev.serverless.celestium.life (public site)
        // - www.dev.serverless.celestium.life (public www)
        // - admin.dev.serverless.celestium.life (admin panel)
        // - media.dev.serverless.celestium.life (media CDN)
        const envDomain = `${props.subdomain}.${props.domainName}`;
        certDomains.push(envDomain);
        certDomains.push(`www.${envDomain}`);
        certDomains.push(`admin.${envDomain}`);
        certDomains.push(`media.${envDomain}`);
      } else {
        // For prod environment:
        // - serverless.celestium.life (public site)
        // - www.serverless.celestium.life (public www)
        // - admin.serverless.celestium.life (admin panel)
        // - media.serverless.celestium.life (media CDN)
        certDomains.push(props.domainName);
        certDomains.push(`www.${props.domainName}`);
        certDomains.push(`admin.${props.domainName}`);
        certDomains.push(`media.${props.domainName}`);
      }
      
      // Note: Using DnsValidatedCertificate (deprecated) because CloudFront requires
      // certificates in us-east-1, and the new Certificate construct doesn't easily
      // support cross-region certificates without a separate stack.
      // This will continue to work and can be migrated when AWS provides a better solution.
      this.certificate = new acm.DnsValidatedCertificate(this, 'Certificate', {
        domainName: certDomains[0],
        subjectAlternativeNames: certDomains.slice(1),
        hostedZone: this.hostedZone,
        region: 'us-east-1', // CloudFront requires certificates in us-east-1
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

    const mediaOai = new cloudfront.OriginAccessIdentity(this, 'MediaOAI', {
      comment: `OAI for media bucket ${props.environment}`,
    });

    // Grant CloudFront access to S3 buckets
    this.adminBucket.grantRead(adminOai);
    this.publicBucket.grantRead(publicOai);
    this.mediaBucket.grantRead(mediaOai);

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

    // Custom cache policy for API endpoints that forwards Authorization header
    // Note: Must have TTL > 0 to include Authorization header
    const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: `cms-api-auth-v3-${props.environment}`,
      comment: 'Minimal caching for API endpoints with Authorization',
      defaultTtl: cdk.Duration.seconds(1),
      maxTtl: cdk.Duration.seconds(1),
      minTtl: cdk.Duration.seconds(0),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Authorization'),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      enableAcceptEncodingGzip: false,
      enableAcceptEncodingBrotli: false,
    });

    // Origin request policy for API to forward headers (Authorization is in CachePolicy)
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

    // Calculate full domain names based on environment
    const getFullDomain = (prefix?: string) => {
      if (!props.domainName) return undefined;
      const parts = [];
      if (prefix) parts.push(prefix);
      if (props.subdomain) parts.push(props.subdomain);
      parts.push(props.domainName);
      return parts.join('.');
    };

    const adminDomain = getFullDomain('admin');
    const publicDomain = props.subdomain ? getFullDomain() : props.domainName;
    const publicWwwDomain = props.subdomain ? getFullDomain('www') : (props.domainName ? `www.${props.domainName}` : undefined);

    // Admin Panel CloudFront Distribution
    this.adminDistribution = new cloudfront.Distribution(this, 'AdminDistribution', {
      comment: `CMS Admin Panel Distribution - ${props.environment}`,
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      domainNames: adminDomain ? [adminDomain] : undefined,
      certificate: this.certificate,
      
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.adminBucket, {
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
      domainNames: publicDomain && publicWwwDomain ? [publicDomain, publicWwwDomain] : undefined,
      certificate: this.certificate,
      
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.publicBucket, {
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

    // Media CloudFront Distribution
    // Note: Custom domain temporarily disabled until certificate validates with new media subdomain
    const mediaDistribution = new cloudfront.Distribution(this, 'MediaDistribution', {
      // domainNames: props.domainName ? [`media.${props.domainName}`] : undefined,
      // certificate: props.domainName ? this.certificate : undefined,
      comment: `CMS Media Distribution - ${props.environment}`,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.mediaBucket, {
          originAccessIdentity: mediaOai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: staticAssetsCachePolicy,
        responseHeadersPolicy: securityHeadersPolicy,
        compress: true,
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      enableIpv6: true,
    });

    // Remove the explicit dependency since we're not using custom domain yet
    // if (this.certificate) {
    //   mediaDistribution.node.addDependency(this.certificate);
    // }

    // Add media CloudFront URL to media functions
    const mediaCdnUrl = `https://${mediaDistribution.distributionDomainName}`;
    mediaUploadFunction.addEnvironment('MEDIA_CDN_URL', mediaCdnUrl);
    mediaGetFunction.addEnvironment('MEDIA_CDN_URL', mediaCdnUrl);
    mediaListFunction.addEnvironment('MEDIA_CDN_URL', mediaCdnUrl);

    // Create Route53 DNS records if custom domain is configured
    if (props.domainName && this.hostedZone && adminDomain) {
      // Admin subdomain A record
      new route53.ARecord(this, 'AdminAliasRecord', {
        zone: this.hostedZone,
        recordName: adminDomain,
        target: route53.RecordTarget.fromAlias(
          new route53targets.CloudFrontTarget(this.adminDistribution)
        ),
      });

      // Public website domain A record
      if (publicDomain) {
        new route53.ARecord(this, 'PublicAliasRecord', {
          zone: this.hostedZone,
          recordName: publicDomain,
          target: route53.RecordTarget.fromAlias(
            new route53targets.CloudFrontTarget(this.publicDistribution)
          ),
        });
      }

      // Public website www subdomain A record
      if (publicWwwDomain) {
        new route53.ARecord(this, 'PublicWwwAliasRecord', {
          zone: this.hostedZone,
          recordName: publicWwwDomain,
          target: route53.RecordTarget.fromAlias(
            new route53targets.CloudFrontTarget(this.publicDistribution)
          ),
        });
      }

      // Media subdomain A record - temporarily disabled until certificate validates
      // const mediaDomain = props.subdomain
      //   ? `media.${props.subdomain}.${props.domainName}`
      //   : `media.${props.domainName}`;
      // new route53.ARecord(this, 'MediaAliasRecord', {
      //   zone: this.hostedZone,
      //   recordName: mediaDomain,
      //   target: route53.RecordTarget.fromAlias(
      //     new route53targets.CloudFrontTarget(mediaDistribution)
      //   ),
      // });
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

    // Custom domain URLs (if configured)
    if (adminDomain) {
      new cdk.CfnOutput(this, 'AdminCustomUrl', {
        value: `https://${adminDomain}`,
        description: 'Admin Panel Custom Domain URL',
      });
    }

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

    if (publicDomain) {
      new cdk.CfnOutput(this, 'PublicCustomUrl', {
        value: `https://${publicDomain}`,
        description: 'Public Website Custom Domain URL',
      });
    }

    new cdk.CfnOutput(this, 'MediaDistributionId', {
      value: mediaDistribution.distributionId,
      description: 'Media CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'MediaDistributionDomainName', {
      value: mediaDistribution.distributionDomainName,
      description: 'Media CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'MediaUrl', {
      value: `https://${mediaDistribution.distributionDomainName}`,
      description: 'Media CloudFront URL',
    });

    // Custom domain outputs (if configured)
    if (props.domainName) {
      new cdk.CfnOutput(this, 'DomainName', {
        value: props.domainName,
        description: 'Custom domain name',
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

    // SES outputs
    new cdk.CfnOutput(this, 'SesFromEmail', {
      value: sesFromEmail,
      description: 'SES From Email Address',
    });

    new cdk.CfnOutput(this, 'SesConfigurationSetName', {
      value: sesConfigurationSet.configurationSetName,
      description: 'SES Configuration Set Name',
    });

    new cdk.CfnOutput(this, 'SesBounceTopicArn', {
      value: sesBouncesTopic.topicArn,
      description: 'SNS Topic ARN for SES Bounces',
    });

    new cdk.CfnOutput(this, 'SesComplaintTopicArn', {
      value: sesComplaintsTopic.topicArn,
      description: 'SNS Topic ARN for SES Complaints',
    });

    // WAF outputs
    new cdk.CfnOutput(this, 'WebAclArn', {
      value: webAcl.attrArn,
      description: 'WAF Web ACL ARN',
    });

    new cdk.CfnOutput(this, 'WebAclId', {
      value: webAcl.attrId,
      description: 'WAF Web ACL ID',
    });

    // Phase 2 Dashboard output
    new cdk.CfnOutput(this, 'Phase2DashboardName', {
      value: phase2Dashboard.dashboardName,
      description: 'CloudWatch Dashboard for Phase 2 Metrics',
    });
  }
}
