#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ServerlessCmsStack } from '../lib/serverless-cms-stack';

const app = new cdk.App();

// Get environment from context (defaults to dev)
const environment = app.node.tryGetContext('environment') || 'dev';

// Environment-specific configuration
const envConfig = {
  dev: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
    domainName: undefined, // No custom domain for dev
    alarmEmail: process.env.ALARM_EMAIL, // Optional: Set via environment variable
  },
  staging: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
    domainName: 'staging-cms.example.com', // Update with your domain
    alarmEmail: process.env.ALARM_EMAIL,
  },
  prod: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-west-2',
    domainName: 'cms.example.com', // Update with your domain
    alarmEmail: process.env.ALARM_EMAIL,
  },
};

const config = envConfig[environment as keyof typeof envConfig];

new ServerlessCmsStack(app, `ServerlessCmsStack-${environment}`, {
  env: {
    account: config.account,
    region: config.region,
  },
  environment,
  domainName: config.domainName,
  alarmEmail: config.alarmEmail,
  tags: {
    Environment: environment,
    Project: 'ServerlessCMS',
  },
});

app.synth();
