import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface WafConstructProps {
  environment: string;
  apiRestApiId: string;
  apiStageName: string;
  region: string;
}

export class WafConstruct extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: WafConstructProps) {
    super(scope, id);

    this.webAcl = new wafv2.CfnWebACL(this, 'ApiWebAcl', {
      name: `cms-api-waf-${props.environment}`,
      description: 'WAF for CMS API with CAPTCHA protection on comment endpoints',
      scope: 'REGIONAL',
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
                { name: 'CrossSiteScripting_BODY' }, // CMS content contains HTML by design
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
    this.webAcl.overrideLogicalId('ApiWebAcl');

    // Associate WAF with API Gateway
    const webAclAssociation = new wafv2.CfnWebACLAssociation(this, 'ApiWebAclAssociation', {
      resourceArn: `arn:aws:apigateway:${props.region}::/restapis/${props.apiRestApiId}/stages/${props.apiStageName}`,
      webAclArn: this.webAcl.attrArn,
    });
    webAclAssociation.overrideLogicalId('ApiWebAclAssociation');

    // Ensure WAF is created before association
    webAclAssociation.node.addDependency(this.webAcl);
  }
}
