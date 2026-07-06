import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import {
  DatabaseConstruct,
  StorageConstruct,
  AuthConstruct,
  EmailConstruct,
  CdnConstruct,
  WafConstruct,
  LambdaApiConstruct,
  MonitoringConstruct,
} from './constructs';
import { preserveLogicalId } from './utils/logical-id';

export interface ServerlessCmsStackProps extends cdk.StackProps {
  environment: string;
  domainName?: string;
  subdomain?: string;
  alarmEmail?: string;
  sesFromEmail?: string;
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

    // ─── Conditional Certificate + HostedZone Lookup ───────────────────
    if (props.domainName) {
      const domainParts = props.domainName.split('.');
      const rootDomain = domainParts.slice(-2).join('.');

      this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: rootDomain,
      });

      const certDomains: string[] = [];

      if (props.subdomain) {
        const envDomain = `${props.subdomain}.${props.domainName}`;
        certDomains.push(envDomain);
        certDomains.push(`www.${envDomain}`);
        certDomains.push(`admin.${envDomain}`);
        certDomains.push(`media.${envDomain}`);
      } else {
        certDomains.push(props.domainName);
        certDomains.push(`www.${props.domainName}`);
        certDomains.push(`admin.${props.domainName}`);
        certDomains.push(`media.${props.domainName}`);
      }

      this.certificate = new acm.DnsValidatedCertificate(this, 'Certificate', {
        domainName: certDomains[0],
        subjectAlternativeNames: certDomains.slice(1),
        hostedZone: this.hostedZone,
        region: 'us-east-1',
      });
    }

    // ─── Infrastructure Constructs ────────────────────────────────────
    const database = new DatabaseConstruct(this, 'Database', {
      environment: props.environment,
    });

    const storage = new StorageConstruct(this, 'Storage', {
      environment: props.environment,
      accountId: this.account,
    });

    const auth = new AuthConstruct(this, 'Auth', {
      environment: props.environment,
    });

    const email = new EmailConstruct(this, 'Email', {
      environment: props.environment,
      domainName: props.domainName,
      alarmEmail: props.alarmEmail,
      sesFromEmail: props.sesFromEmail,
    });

    // ─── API Gateway REST API (cross-cutting) ─────────────────────────
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
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token'],
        allowCredentials: true,
      },
    });

    // ─── Cognito Authorizer ───────────────────────────────────────────
    this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [auth.userPool],
      authorizerName: `cms-authorizer-${props.environment}`,
    });
    preserveLogicalId(this.authorizer, 'CognitoAuthorizerF3215DBC');

    // ─── CDN Construct ────────────────────────────────────────────────
    const cdn = new CdnConstruct(this, 'Cdn', {
      environment: props.environment,
      domainName: props.domainName,
      subdomain: props.subdomain,
      mediaBucket: storage.mediaBucket,
      adminBucket: storage.adminBucket,
      publicBucket: storage.publicBucket,
      api: this.api,
      certificate: this.certificate,
      hostedZone: this.hostedZone,
    });

    // ─── WAF Construct ────────────────────────────────────────────────
    const waf = new WafConstruct(this, 'Waf', {
      environment: props.environment,
      apiRestApiId: this.api.restApiId,
      apiStageName: props.environment,
      region: this.region,
    });

    // ─── LambdaApi Construct ──────────────────────────────────────────
    const lambdaApi = new LambdaApiConstruct(this, 'LambdaApi', {
      environment: props.environment,
      contentTable: database.contentTable,
      mediaTable: database.mediaTable,
      usersTable: database.usersTable,
      settingsTable: database.settingsTable,
      pluginsTable: database.pluginsTable,
      commentsTable: database.commentsTable,
      mediaBucket: storage.mediaBucket,
      userPool: auth.userPool,
      userPoolClient: auth.userPoolClient,
      api: this.api,
      authorizer: this.authorizer,
      sesFromEmail: email.sesFromEmail,
      sesConfigurationSetName: email.sesConfigurationSetName,
      mediaCdnUrl: cdn.mediaCdnUrl,
    });

    // ─── Monitoring Construct ─────────────────────────────────────────
    const monitoring = new MonitoringConstruct(this, 'Monitoring', {
      environment: props.environment,
      alarmEmail: props.alarmEmail,
      lambdaFunctions: lambdaApi.allFunctions,
      api: this.api,
      contentTable: database.contentTable,
      commentsTable: database.commentsTable,
      sesFromEmail: email.sesFromEmail,
    });

    // ─── Public Property Assignments ──────────────────────────────────
    this.contentTable = database.contentTable;
    this.mediaTable = database.mediaTable;
    this.usersTable = database.usersTable;
    this.settingsTable = database.settingsTable;
    this.pluginsTable = database.pluginsTable;
    this.commentsTable = database.commentsTable;
    this.mediaBucket = storage.mediaBucket;
    this.adminBucket = storage.adminBucket;
    this.publicBucket = storage.publicBucket;
    this.userPool = auth.userPool;
    this.userPoolClient = auth.userPoolClient;
    this.schedulerFunction = lambdaApi.schedulerFunction;
    this.adminDistribution = cdn.adminDistribution;
    this.publicDistribution = cdn.publicDistribution;

    // ─── Domain Computation (for conditional outputs) ─────────────────
    const adminDomain = props.domainName
      ? (props.subdomain
          ? `admin.${props.subdomain}.${props.domainName}`
          : `admin.${props.domainName}`)
      : undefined;

    const publicDomain = props.domainName
      ? (props.subdomain
          ? `${props.subdomain}.${props.domainName}`
          : props.domainName)
      : undefined;

    // ─── CfnOutputs ──────────────────────────────────────────────────

    const envOutput = new cdk.CfnOutput(this, 'Environment', {
      value: props.environment,
      description: 'Deployment environment',
    });
    envOutput.overrideLogicalId('Environment');

    const contentTableOutput = new cdk.CfnOutput(this, 'ContentTableName', {
      value: this.contentTable.tableName,
      description: 'Content table name',
    });
    contentTableOutput.overrideLogicalId('ContentTableName');

    const mediaTableOutput = new cdk.CfnOutput(this, 'MediaTableName', {
      value: this.mediaTable.tableName,
      description: 'Media table name',
    });
    mediaTableOutput.overrideLogicalId('MediaTableName');

    const usersTableOutput = new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
      description: 'Users table name',
    });
    usersTableOutput.overrideLogicalId('UsersTableName');

    const settingsTableOutput = new cdk.CfnOutput(this, 'SettingsTableName', {
      value: this.settingsTable.tableName,
      description: 'Settings table name',
    });
    settingsTableOutput.overrideLogicalId('SettingsTableName');

    const pluginsTableOutput = new cdk.CfnOutput(this, 'PluginsTableName', {
      value: this.pluginsTable.tableName,
      description: 'Plugins table name',
    });
    pluginsTableOutput.overrideLogicalId('PluginsTableName');

    const mediaBucketOutput = new cdk.CfnOutput(this, 'MediaBucketName', {
      value: this.mediaBucket.bucketName,
      description: 'Media bucket name',
    });
    mediaBucketOutput.overrideLogicalId('MediaBucketName');

    const adminBucketOutput = new cdk.CfnOutput(this, 'AdminBucketName', {
      value: this.adminBucket.bucketName,
      description: 'Admin panel bucket name',
    });
    adminBucketOutput.overrideLogicalId('AdminBucketName');

    const adminBucketUrlOutput = new cdk.CfnOutput(this, 'AdminBucketWebsiteUrl', {
      value: this.adminBucket.bucketWebsiteUrl,
      description: 'Admin panel website URL',
    });
    adminBucketUrlOutput.overrideLogicalId('AdminBucketWebsiteUrl');

    const publicBucketOutput = new cdk.CfnOutput(this, 'PublicBucketName', {
      value: this.publicBucket.bucketName,
      description: 'Public website bucket name',
    });
    publicBucketOutput.overrideLogicalId('PublicBucketName');

    const publicBucketUrlOutput = new cdk.CfnOutput(this, 'PublicBucketWebsiteUrl', {
      value: this.publicBucket.bucketWebsiteUrl,
      description: 'Public website URL',
    });
    publicBucketUrlOutput.overrideLogicalId('PublicBucketWebsiteUrl');

    const userPoolIdOutput = new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });
    userPoolIdOutput.overrideLogicalId('UserPoolId');

    const userPoolClientIdOutput = new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });
    userPoolClientIdOutput.overrideLogicalId('UserPoolClientId');

    const userPoolArnOutput = new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
    });
    userPoolArnOutput.overrideLogicalId('UserPoolArn');

    const schedulerFnNameOutput = new cdk.CfnOutput(this, 'SchedulerFunctionName', {
      value: this.schedulerFunction.functionName,
      description: 'Scheduler Lambda function name',
    });
    schedulerFnNameOutput.overrideLogicalId('SchedulerFunctionName');

    const schedulerFnArnOutput = new cdk.CfnOutput(this, 'SchedulerFunctionArn', {
      value: this.schedulerFunction.functionArn,
      description: 'Scheduler Lambda function ARN',
    });
    schedulerFnArnOutput.overrideLogicalId('SchedulerFunctionArn');

    const apiUrlOutput = new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
    });
    apiUrlOutput.overrideLogicalId('ApiUrl');

    const apiIdOutput = new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
    });
    apiIdOutput.overrideLogicalId('ApiId');

    const apiEndpointOutput = new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: `${this.api.url}api/v1`,
      description: 'API Gateway v1 endpoint',
    });
    apiEndpointOutput.overrideLogicalId('ApiEndpoint');

    const adminDistIdOutput = new cdk.CfnOutput(this, 'AdminDistributionId', {
      value: this.adminDistribution.distributionId,
      description: 'Admin CloudFront Distribution ID',
    });
    adminDistIdOutput.overrideLogicalId('AdminDistributionId');

    const adminDistDomainOutput = new cdk.CfnOutput(this, 'AdminDistributionDomainName', {
      value: this.adminDistribution.distributionDomainName,
      description: 'Admin CloudFront Distribution Domain Name',
    });
    adminDistDomainOutput.overrideLogicalId('AdminDistributionDomainName');

    const adminUrlOutput = new cdk.CfnOutput(this, 'AdminUrl', {
      value: `https://${this.adminDistribution.distributionDomainName}`,
      description: 'Admin Panel URL',
    });
    adminUrlOutput.overrideLogicalId('AdminUrl');

    // Custom domain URLs (if configured)
    if (adminDomain) {
      const adminCustomUrlOutput = new cdk.CfnOutput(this, 'AdminCustomUrl', {
        value: `https://${adminDomain}`,
        description: 'Admin Panel Custom Domain URL',
      });
      adminCustomUrlOutput.overrideLogicalId('AdminCustomUrl');
    }

    const publicDistIdOutput = new cdk.CfnOutput(this, 'PublicDistributionId', {
      value: this.publicDistribution.distributionId,
      description: 'Public CloudFront Distribution ID',
    });
    publicDistIdOutput.overrideLogicalId('PublicDistributionId');

    const publicDistDomainOutput = new cdk.CfnOutput(this, 'PublicDistributionDomainName', {
      value: this.publicDistribution.distributionDomainName,
      description: 'Public CloudFront Distribution Domain Name',
    });
    publicDistDomainOutput.overrideLogicalId('PublicDistributionDomainName');

    const publicUrlOutput = new cdk.CfnOutput(this, 'PublicUrl', {
      value: `https://${this.publicDistribution.distributionDomainName}`,
      description: 'Public Website URL',
    });
    publicUrlOutput.overrideLogicalId('PublicUrl');

    if (publicDomain) {
      const publicCustomUrlOutput = new cdk.CfnOutput(this, 'PublicCustomUrl', {
        value: `https://${publicDomain}`,
        description: 'Public Website Custom Domain URL',
      });
      publicCustomUrlOutput.overrideLogicalId('PublicCustomUrl');
    }

    const mediaDistIdOutput = new cdk.CfnOutput(this, 'MediaDistributionId', {
      value: cdn.mediaDistribution.distributionId,
      description: 'Media CloudFront Distribution ID',
    });
    mediaDistIdOutput.overrideLogicalId('MediaDistributionId');

    const mediaDistDomainOutput = new cdk.CfnOutput(this, 'MediaDistributionDomainName', {
      value: cdn.mediaDistribution.distributionDomainName,
      description: 'Media CloudFront Distribution Domain Name',
    });
    mediaDistDomainOutput.overrideLogicalId('MediaDistributionDomainName');

    const mediaUrlOutput = new cdk.CfnOutput(this, 'MediaUrl', {
      value: `https://${cdn.mediaDistribution.distributionDomainName}`,
      description: 'Media CloudFront URL',
    });
    mediaUrlOutput.overrideLogicalId('MediaUrl');

    // Custom domain outputs (if configured)
    if (props.domainName) {
      const domainNameOutput = new cdk.CfnOutput(this, 'DomainName', {
        value: props.domainName,
        description: 'Custom domain name',
      });
      domainNameOutput.overrideLogicalId('DomainName');

      if (this.certificate) {
        const certArnOutput = new cdk.CfnOutput(this, 'CertificateArn', {
          value: this.certificate.certificateArn,
          description: 'ACM Certificate ARN',
        });
        certArnOutput.overrideLogicalId('CertificateArn');
      }

      if (this.hostedZone) {
        const hostedZoneOutput = new cdk.CfnOutput(this, 'HostedZoneId', {
          value: this.hostedZone.hostedZoneId,
          description: 'Route53 Hosted Zone ID',
        });
        hostedZoneOutput.overrideLogicalId('HostedZoneId');
      }
    }

    // Monitoring outputs
    const alarmTopicArnOutput = new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: monitoring.alarmTopic.topicArn,
      description: 'SNS Topic ARN for CloudWatch Alarms',
    });
    alarmTopicArnOutput.overrideLogicalId('AlarmTopicArn');

    const alarmTopicNameOutput = new cdk.CfnOutput(this, 'AlarmTopicName', {
      value: monitoring.alarmTopic.topicName,
      description: 'SNS Topic Name for CloudWatch Alarms',
    });
    alarmTopicNameOutput.overrideLogicalId('AlarmTopicName');

    // SES outputs
    const sesFromEmailOutput = new cdk.CfnOutput(this, 'SesFromEmail', {
      value: email.sesFromEmail,
      description: 'SES From Email Address',
    });
    sesFromEmailOutput.overrideLogicalId('SesFromEmail');

    const sesConfigSetOutput = new cdk.CfnOutput(this, 'SesConfigurationSetName', {
      value: email.sesConfigurationSetName,
      description: 'SES Configuration Set Name',
    });
    sesConfigSetOutput.overrideLogicalId('SesConfigurationSetName');

    const sesBounceOutput = new cdk.CfnOutput(this, 'SesBounceTopicArn', {
      value: email.sesBouncesTopic.topicArn,
      description: 'SNS Topic ARN for SES Bounces',
    });
    sesBounceOutput.overrideLogicalId('SesBounceTopicArn');

    const sesComplaintOutput = new cdk.CfnOutput(this, 'SesComplaintTopicArn', {
      value: email.sesComplaintsTopic.topicArn,
      description: 'SNS Topic ARN for SES Complaints',
    });
    sesComplaintOutput.overrideLogicalId('SesComplaintTopicArn');

    // WAF outputs
    const webAclArnOutput = new cdk.CfnOutput(this, 'WebAclArn', {
      value: waf.webAcl.attrArn,
      description: 'WAF Web ACL ARN',
    });
    webAclArnOutput.overrideLogicalId('WebAclArn');

    const webAclIdOutput = new cdk.CfnOutput(this, 'WebAclId', {
      value: waf.webAcl.attrId,
      description: 'WAF Web ACL ID',
    });
    webAclIdOutput.overrideLogicalId('WebAclId');

    // Phase 2 Dashboard output
    const dashboardOutput = new cdk.CfnOutput(this, 'Phase2DashboardName', {
      value: monitoring.dashboardName,
      description: 'CloudWatch Dashboard for Phase 2 Metrics',
    });
    dashboardOutput.overrideLogicalId('Phase2DashboardName');
  }
}
