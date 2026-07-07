import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { preserveLogicalId } from '../utils/logical-id';

export interface DatabaseConstructProps {
  environment: string;
}

export class DatabaseConstruct extends Construct {
  public readonly contentTable: dynamodb.Table;
  public readonly mediaTable: dynamodb.Table;
  public readonly usersTable: dynamodb.Table;
  public readonly settingsTable: dynamodb.Table;
  public readonly pluginsTable: dynamodb.Table;
  public readonly commentsTable: dynamodb.Table;
  public readonly sectionsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

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
    preserveLogicalId(this.contentTable, 'ContentTableA82027C3');

    this.contentTable.addGlobalSecondaryIndex({
      indexName: 'slug-index',
      partitionKey: { name: 'slug', type: dynamodb.AttributeType.STRING },
    });

    this.contentTable.addGlobalSecondaryIndex({
      indexName: 'type-published_at-index',
      partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'published_at', type: dynamodb.AttributeType.NUMBER },
    });

    this.contentTable.addGlobalSecondaryIndex({
      indexName: 'status-published_at-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'published_at', type: dynamodb.AttributeType.NUMBER },
    });

    this.contentTable.addGlobalSecondaryIndex({
      indexName: 'section_id-published_at-index',
      partitionKey: { name: 'section_id', type: dynamodb.AttributeType.STRING },
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
    preserveLogicalId(this.mediaTable, 'MediaTableCFC93525');

    // Users Table
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `cms-users-${props.environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
    preserveLogicalId(this.usersTable, 'UsersTable9725E9C8');

    this.usersTable.addGlobalSecondaryIndex({
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
    preserveLogicalId(this.settingsTable, 'SettingsTable4DB0CCD0');

    // Plugins Table
    this.pluginsTable = new dynamodb.Table(this, 'PluginsTable', {
      tableName: `cms-plugins-${props.environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
    preserveLogicalId(this.pluginsTable, 'PluginsTable93F64FF4');

    // Comments Table
    this.commentsTable = new dynamodb.Table(this, 'CommentsTable', {
      tableName: `cms-comments-${props.environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
    preserveLogicalId(this.commentsTable, 'CommentsTableBBDBF0A8');

    this.commentsTable.addGlobalSecondaryIndex({
      indexName: 'content_id-created_at-index',
      partitionKey: { name: 'content_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.NUMBER },
    });

    this.commentsTable.addGlobalSecondaryIndex({
      indexName: 'status-created_at-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.NUMBER },
    });

    // Sections Table
    this.sectionsTable = new dynamodb.Table(this, 'SectionsTable', {
      tableName: `cms-sections-${props.environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    this.sectionsTable.addGlobalSecondaryIndex({
      indexName: 'slug-index',
      partitionKey: { name: 'slug', type: dynamodb.AttributeType.STRING },
    });

    this.sectionsTable.addGlobalSecondaryIndex({
      indexName: 'parent_id-sort_order-index',
      partitionKey: { name: 'parent_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sort_order', type: dynamodb.AttributeType.NUMBER },
    });
  }
}
