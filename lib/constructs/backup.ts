import * as cdk from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';

export interface BackupConstructProps {
  environment: string;
  contentTable: dynamodb.ITable;
  mediaTable: dynamodb.ITable;
  usersTable: dynamodb.ITable;
  settingsTable: dynamodb.ITable;
  commentsTable: dynamodb.ITable;
  pluginsTable: dynamodb.ITable;
  sectionsTable: dynamodb.ITable;
  themesTable: dynamodb.ITable;
  mediaBucket: s3.IBucket;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
  sharedLayer: lambda.ILayerVersion;
}

export class BackupConstruct extends Construct {
  public readonly backupJobsTable: dynamodb.Table;
  public readonly backupBucket: s3.Bucket;
  public readonly backupFunction: lambda.Function;
  public readonly restoreFunction: lambda.Function;
  public readonly apiHandlerFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: BackupConstructProps) {
    super(scope, id);

    // ─── DynamoDB Table: Backup Jobs ──────────────────────────────────
    this.backupJobsTable = new dynamodb.Table(this, 'BackupJobsTable', {
      tableName: `cms-backup-jobs-${props.environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    this.backupJobsTable.addGlobalSecondaryIndex({
      indexName: 'type-created_at-index',
      partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.NUMBER },
    });

    // ─── S3 Bucket: Backup Archives ──────────────────────────────────
    this.backupBucket = new s3.Bucket(this, 'BackupBucket', {
      bucketName: `serverless-cms-backups-${props.environment}-776053071238`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          id: 'TransitionToGlacier',
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90),
            },
          ],
        },
      ],
    });

    // ─── Common Environment Variables ─────────────────────────────────
    const commonEnv: Record<string, string> = {
      BACKUP_JOBS_TABLE: this.backupJobsTable.tableName,
      BACKUP_BUCKET: this.backupBucket.bucketName,
      CONTENT_TABLE: props.contentTable.tableName,
      MEDIA_TABLE: props.mediaTable.tableName,
      USERS_TABLE: props.usersTable.tableName,
      SETTINGS_TABLE: props.settingsTable.tableName,
      COMMENTS_TABLE: props.commentsTable.tableName,
      PLUGINS_TABLE: props.pluginsTable.tableName,
      SECTIONS_TABLE: props.sectionsTable.tableName,
      THEMES_TABLE: props.themesTable.tableName,
      MEDIA_BUCKET: props.mediaBucket.bucketName,
      ENVIRONMENT: props.environment,
      COGNITO_REGION: cdk.Stack.of(this).region,
      USER_POOL_ID: props.userPool.userPoolId,
      USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
    };

    // ─── Backup Lambda Function ───────────────────────────────────────
    this.backupFunction = new lambda.Function(this, 'BackupExecutorFunction', {
      functionName: `cms-backup-executor-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'backup_handler.handler',
      code: lambda.Code.fromAsset('lambda/backup'),
      timeout: Duration.minutes(15),
      memorySize: 1024,
      layers: [props.sharedLayer],
      environment: {
        ...commonEnv,
        BACKUP_FUNCTION_NAME: `cms-backup-executor-${props.environment}`,
        RESTORE_FUNCTION_NAME: `cms-restore-executor-${props.environment}`,
      },
    });

    // ─── Restore Lambda Function ──────────────────────────────────────
    this.restoreFunction = new lambda.Function(this, 'RestoreExecutorFunction', {
      functionName: `cms-restore-executor-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'restore_handler.handler',
      code: lambda.Code.fromAsset('lambda/backup'),
      timeout: Duration.minutes(15),
      memorySize: 1024,
      layers: [props.sharedLayer],
      environment: {
        ...commonEnv,
        BACKUP_FUNCTION_NAME: `cms-backup-executor-${props.environment}`,
        RESTORE_FUNCTION_NAME: `cms-restore-executor-${props.environment}`,
      },
    });

    // ─── API Handler Lambda Function ──────────────────────────────────
    this.apiHandlerFunction = new lambda.Function(this, 'BackupApiFunction', {
      functionName: `cms-backup-api-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'api_handler.handler',
      code: lambda.Code.fromAsset('lambda/backup'),
      timeout: Duration.seconds(30),
      memorySize: 256,
      layers: [props.sharedLayer],
      environment: {
        ...commonEnv,
        BACKUP_FUNCTION_NAME: this.backupFunction.functionName,
        RESTORE_FUNCTION_NAME: this.restoreFunction.functionName,
      },
    });

    // ─── IAM Permissions ──────────────────────────────────────────────

    // Backup Lambda: read all CMS tables, read media bucket, read/write backup bucket + jobs table
    props.contentTable.grantReadData(this.backupFunction);
    props.mediaTable.grantReadData(this.backupFunction);
    props.usersTable.grantReadData(this.backupFunction);
    props.settingsTable.grantReadData(this.backupFunction);
    props.commentsTable.grantReadData(this.backupFunction);
    props.pluginsTable.grantReadData(this.backupFunction);
    props.sectionsTable.grantReadData(this.backupFunction);
    props.themesTable.grantReadData(this.backupFunction);
    props.mediaBucket.grantRead(this.backupFunction);
    this.backupBucket.grantReadWrite(this.backupFunction);
    this.backupJobsTable.grantReadWriteData(this.backupFunction);

    // Restore Lambda: read/write all CMS tables, read/write media bucket, read backup bucket, read/write jobs table
    props.contentTable.grantReadWriteData(this.restoreFunction);
    props.mediaTable.grantReadWriteData(this.restoreFunction);
    props.usersTable.grantReadWriteData(this.restoreFunction);
    props.settingsTable.grantReadWriteData(this.restoreFunction);
    props.commentsTable.grantReadWriteData(this.restoreFunction);
    props.pluginsTable.grantReadWriteData(this.restoreFunction);
    props.sectionsTable.grantReadWriteData(this.restoreFunction);
    props.themesTable.grantReadWriteData(this.restoreFunction);
    props.mediaBucket.grantReadWrite(this.restoreFunction);
    this.backupBucket.grantRead(this.restoreFunction);
    this.backupJobsTable.grantReadWriteData(this.restoreFunction);

    // API Handler: read/write jobs table, read/write backup bucket, invoke backup + restore lambdas, read/write settings table
    this.backupJobsTable.grantReadWriteData(this.apiHandlerFunction);
    this.backupBucket.grantReadWrite(this.apiHandlerFunction);
    this.backupFunction.grantInvoke(this.apiHandlerFunction);
    this.restoreFunction.grantInvoke(this.apiHandlerFunction);
    props.settingsTable.grantReadWriteData(this.apiHandlerFunction);

    // ─── EventBridge Rule (Scheduled Backup - Initially Disabled) ─────
    const scheduledBackupRule = new events.Rule(this, 'ScheduledBackupRule', {
      ruleName: `cms-scheduled-backup-${props.environment}`,
      description: 'Triggers scheduled backup Lambda daily (initially disabled)',
      schedule: events.Schedule.rate(Duration.days(1)),
      enabled: false,
    });

    scheduledBackupRule.addTarget(new targets.LambdaFunction(this.backupFunction, {
      retryAttempts: 2,
    }));
  }
}
