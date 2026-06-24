import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { preserveLogicalId } from '../utils/logical-id';

export interface StorageConstructProps {
  environment: string;
  accountId: string;
}

export class StorageConstruct extends Construct {
  public readonly mediaBucket: s3.Bucket;
  public readonly adminBucket: s3.Bucket;
  public readonly publicBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageConstructProps) {
    super(scope, id);

    // Media storage bucket - for uploaded files and generated thumbnails
    this.mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: `serverless-cms-media-${props.environment}-${props.accountId}`,
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
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });
    preserveLogicalId(this.mediaBucket, 'MediaBucketBCBB02BA');

    // Admin Panel Bucket - for hosting the React admin application
    this.adminBucket = new s3.Bucket(this, 'AdminBucket', {
      bucketName: `serverless-cms-admin-${props.environment}-${props.accountId}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
    });
    preserveLogicalId(this.adminBucket, 'AdminBucketB0A70AB7');
    // Preserve bucket policy logical ID (created by publicReadAccess)
    const adminBucketPolicy = this.adminBucket.node.tryFindChild('Policy');
    if (adminBucketPolicy) {
      const cfn = (adminBucketPolicy as cdk.Resource).node.defaultChild as cdk.CfnResource;
      if (cfn) cfn.overrideLogicalId('AdminBucketPolicy712E7130');
    }

    // Public Website Bucket - for hosting the React public website
    this.publicBucket = new s3.Bucket(this, 'PublicBucket', {
      bucketName: `serverless-cms-public-${props.environment}-${props.accountId}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
    });
    preserveLogicalId(this.publicBucket, 'PublicBucketA6745C15');
    // Preserve bucket policy logical ID (created by publicReadAccess)
    const publicBucketPolicy = this.publicBucket.node.tryFindChild('Policy');
    if (publicBucketPolicy) {
      const cfn = (publicBucketPolicy as cdk.Resource).node.defaultChild as cdk.CfnResource;
      if (cfn) cfn.overrideLogicalId('PublicBucketPolicy7E93A808');
    }
  }
}
