import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { preserveLogicalId } from '../utils/logical-id';

export interface CdnConstructProps {
  environment: string;
  domainName?: string;
  subdomain?: string;
  /** Additional root domain aliases for the public distribution (e.g., ['celestium.life', 'www.celestium.life']) */
  rootDomainAliases?: string[];
  mediaBucket: s3.Bucket;
  adminBucket: s3.Bucket;
  publicBucket: s3.Bucket;
  api: apigateway.RestApi;
  certificate?: acm.ICertificate;
  hostedZone?: route53.IHostedZone;
}

export class CdnConstruct extends Construct {
  public readonly adminDistribution: cloudfront.Distribution;
  public readonly publicDistribution: cloudfront.Distribution;
  public readonly mediaDistribution: cloudfront.Distribution;
  public readonly mediaCdnUrl: string;

  constructor(scope: Construct, id: string, props: CdnConstructProps) {
    super(scope, id);

    // Origin Access Identities for S3 buckets
    const adminOai = new cloudfront.OriginAccessIdentity(this, 'AdminOAI', {
      comment: `OAI for admin bucket ${props.environment}`,
    });
    preserveLogicalId(adminOai, 'AdminOAI1CC1CB26');

    const publicOai = new cloudfront.OriginAccessIdentity(this, 'PublicOAI', {
      comment: `OAI for public bucket ${props.environment}`,
    });
    preserveLogicalId(publicOai, 'PublicOAI172311A0');

    const mediaOai = new cloudfront.OriginAccessIdentity(this, 'MediaOAI', {
      comment: `OAI for media bucket ${props.environment}`,
    });
    preserveLogicalId(mediaOai, 'MediaOAIB77D0788');

    // Grant CloudFront access to S3 buckets
    props.adminBucket.grantRead(adminOai);
    props.publicBucket.grantRead(publicOai);
    props.mediaBucket.grantRead(mediaOai);

    // Preserve media bucket policy logical ID (created by grantRead above)
    const mediaBucketPolicy = props.mediaBucket.node.tryFindChild('Policy');
    if (mediaBucketPolicy) {
      const cfn = (mediaBucketPolicy as cdk.Resource).node.defaultChild as cdk.CfnResource;
      if (cfn) cfn.overrideLogicalId('MediaBucketPolicy68C27F6B');
    }

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
    preserveLogicalId(staticAssetsCachePolicy, 'StaticAssetsCachePolicyA7AB90E0');

    // Custom cache policy for API endpoints that forwards Authorization header
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
    preserveLogicalId(apiCachePolicy, 'ApiCachePolicyF71AA3E6');

    // Origin request policy for API to forward headers
    const apiOriginRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'ApiOriginRequestPolicy', {
      originRequestPolicyName: `cms-api-origin-v2-${props.environment}`,
      comment: 'Forward all headers and query strings to API',
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
        'Content-Type', 'Accept', 'Origin', 'Referer', 'User-Agent', 'CloudFront-Viewer-Country'
      ),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
    });
    preserveLogicalId(apiOriginRequestPolicy, 'ApiOriginRequestPolicy7A536D4C');

    // Response headers policy for security headers
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
    preserveLogicalId(securityHeadersPolicy, 'SecurityHeadersPolicyE1741D63');

    // Calculate full domain names based on environment
    const getFullDomain = (prefix?: string) => {
      if (!props.domainName) return undefined;
      const parts: string[] = [];
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
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      domainNames: adminDomain ? [adminDomain] : undefined,
      certificate: props.certificate,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(props.adminBucket, {
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
        '/api/*': {
          origin: new origins.RestApiOrigin(props.api, {
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
    preserveLogicalId(this.adminDistribution, 'AdminDistribution4E89F8C0');

    // Public Website CloudFront Distribution
    const publicDomainNames = publicDomain && publicWwwDomain ? [publicDomain, publicWwwDomain] : undefined;
    // Append root domain aliases if specified (e.g., celestium.life, www.celestium.life)
    if (publicDomainNames && props.rootDomainAliases && props.rootDomainAliases.length > 0) {
      publicDomainNames.push(...props.rootDomainAliases);
    }

    this.publicDistribution = new cloudfront.Distribution(this, 'PublicDistribution', {
      comment: `CMS Public Website Distribution - ${props.environment}`,
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      domainNames: publicDomainNames,
      certificate: props.certificate,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(props.publicBucket, {
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
        '/api/*': {
          origin: new origins.RestApiOrigin(props.api, {
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
    preserveLogicalId(this.publicDistribution, 'PublicDistributionDA9149C2');

    // Media CloudFront Distribution (no custom domain currently)
    this.mediaDistribution = new cloudfront.Distribution(this, 'MediaDistribution', {
      comment: `CMS Media Distribution - ${props.environment}`,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(props.mediaBucket, {
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
    preserveLogicalId(this.mediaDistribution, 'MediaDistribution4D42B96F');

    // Create Route53 DNS records if custom domain is configured
    if (props.domainName && props.hostedZone && adminDomain) {
      // Admin subdomain A record
      const adminAliasRecord = new route53.ARecord(this, 'AdminAliasRecord', {
        zone: props.hostedZone,
        recordName: adminDomain,
        target: route53.RecordTarget.fromAlias(
          new route53targets.CloudFrontTarget(this.adminDistribution)
        ),
      });
      preserveLogicalId(adminAliasRecord, 'AdminAliasRecord572D1EBD');

      // Public website domain A record
      if (publicDomain) {
        const publicAliasRecord = new route53.ARecord(this, 'PublicAliasRecord', {
          zone: props.hostedZone,
          recordName: publicDomain,
          target: route53.RecordTarget.fromAlias(
            new route53targets.CloudFrontTarget(this.publicDistribution)
          ),
        });
        preserveLogicalId(publicAliasRecord, 'PublicAliasRecord3397A30C');
      }

      // Public website www subdomain A record
      if (publicWwwDomain) {
        const publicWwwAliasRecord = new route53.ARecord(this, 'PublicWwwAliasRecord', {
          zone: props.hostedZone,
          recordName: publicWwwDomain,
          target: route53.RecordTarget.fromAlias(
            new route53targets.CloudFrontTarget(this.publicDistribution)
          ),
        });
        preserveLogicalId(publicWwwAliasRecord, 'PublicWwwAliasRecord960A8791');
      }

      // Root domain alias records (e.g., celestium.life, www.celestium.life)
      if (props.rootDomainAliases) {
        props.rootDomainAliases.forEach((aliasDomain, index) => {
          new route53.ARecord(this, `RootDomainAlias${index}`, {
            zone: props.hostedZone!,
            recordName: aliasDomain,
            target: route53.RecordTarget.fromAlias(
              new route53targets.CloudFrontTarget(this.publicDistribution)
            ),
          });
        });
      }
    }

    // Compute media CDN URL
    this.mediaCdnUrl = `https://${this.mediaDistribution.distributionDomainName}`;
  }
}
