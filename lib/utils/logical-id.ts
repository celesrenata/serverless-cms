import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

/**
 * Override the logical ID of a CDK resource's underlying CfnResource
 * to preserve the original CloudFormation logical ID from the monolith stack.
 */
export function preserveLogicalId(resource: IConstruct, logicalId: string): void {
  const cfnResource = resource.node.defaultChild as cdk.CfnResource;
  if (cfnResource) {
    cfnResource.overrideLogicalId(logicalId);
  }
}
