export interface EnvironmentConfig {
  account?: string;
  region: string;
  domainName?: string;
  certificateArn?: string;
  hostedZoneId?: string;
  hostedZoneName?: string;
}

export const environments: Record<string, EnvironmentConfig> = {
  dev: {
    region: 'us-west-2',
    // No custom domain for dev environment
  },
  staging: {
    region: 'us-west-2',
    domainName: 'staging-cms.example.com',
    hostedZoneName: 'example.com',
    // Update these values with your actual AWS resources
  },
  prod: {
    region: 'us-west-2',
    domainName: 'cms.example.com',
    hostedZoneName: 'example.com',
    // Update these values with your actual AWS resources
  },
};
