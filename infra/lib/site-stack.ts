/**
 * The site: a private bucket, CloudFront in front of it, and the zone's apex
 * pointing at CloudFront. Nothing stateful: the bucket is rebuilt from `site/`
 * on every deploy.
 */
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import type { Construct } from "constructs";
import { ACCOUNT, PRIMARY_REGION, SITE_HOSTNAME, SITE_URL, ZONE_NAME } from "./constants.js";

export interface SiteStackProps extends StackProps {
  readonly certificate: acm.ICertificate;
  readonly hostedZoneId: string;
  /** The directory whose files are the site. */
  readonly sitePath: string;
}

export class SiteStack extends Stack {
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: SiteStackProps) {
    const { certificate, hostedZoneId, sitePath, ...stackProps } = props;
    super(scope, id, {
      stackName: "nightshift-site",
      env: { account: ACCOUNT, region: PRIMARY_REGION },
      crossRegionReferences: true,
      ...stackProps,
    });

    const bucket = new s3.Bucket(this, "SiteBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      // Typed as the interface: CDK's concrete class does not satisfy its own
      // interface under `exactOptionalPropertyTypes`, as the Studio stack found.
    }) as s3.IBucket;

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: "Nightshift site",
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        compress: true,
      },
      defaultRootObject: "index.html",
      domainNames: [SITE_HOSTNAME],
      certificate,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
          ttl: Duration.minutes(5),
        },
      ],
    });

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId,
      zoneName: ZONE_NAME,
    });
    const target = route53.RecordTarget.fromAlias(new CloudFrontTarget(this.distribution));
    new route53.ARecord(this, "ApexA", { zone, target, comment: "Nightshift site" });
    new route53.AaaaRecord(this, "ApexAAAA", { zone, target, comment: "Nightshift site" });

    new BucketDeployment(this, "SiteDeployment", {
      destinationBucket: bucket,
      sources: [Source.asset(sitePath)],
      prune: true,
      distribution: this.distribution,
      distributionPaths: ["/*"],
    });

    new CfnOutput(this, "SiteUrl", { value: SITE_URL });
    new CfnOutput(this, "DistributionId", { value: this.distribution.distributionId });
  }
}
