import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import type { Construct } from "constructs";
import * as path from "node:path";
import {
  createSpaRoutingFunction,
  createWebSecurityHeadersPolicy,
  createWebStaticAssetsCachePolicy,
  createWebStaticAssetsSecurityHeadersPolicy,
  TLS_POLICY,
} from "./cdn-shared";
import { WEB_DOMAIN, WEB_URL } from "./domain-config";
import type { SiteStackProps } from "./stack-props";

const repoRoot = path.resolve(process.cwd(), "../..");
const webDistRoot = path.join(repoRoot, "apps/web/dist");

export class PlaylangWebStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    this.bucket = new s3.Bucket(this, "WebBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      versioned: true,
    });

    const origin = origins.S3BucketOrigin.withOriginAccessControl(this.bucket);
    const securityHeadersPolicy = createWebSecurityHeadersPolicy(
      this,
      "WebSecurityHeaders",
    );
    const staticAssetsCachePolicy = createWebStaticAssetsCachePolicy(
      this,
      "WebStaticAssetsCachePolicy",
    );
    const staticAssetsSecurityHeadersPolicy =
      createWebStaticAssetsSecurityHeadersPolicy(
        this,
        "WebStaticAssetsSecurityHeaders",
      );
    const spaRoutingFunction = createSpaRoutingFunction(this, "SpaRouting");

    this.distribution = new cloudfront.Distribution(this, "WebDistribution", {
      defaultBehavior: {
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        responseHeadersPolicy: securityHeadersPolicy,
        compress: true,
        functionAssociations: [
          {
            function: spaRoutingFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        "/assets/*": {
          origin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: staticAssetsCachePolicy,
          responseHeadersPolicy: staticAssetsSecurityHeadersPolicy,
          compress: true,
        },
      },
      domainNames: [WEB_DOMAIN],
      certificate: props.certificate,
      minimumProtocolVersion: TLS_POLICY,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      defaultRootObject: "index.html",
      comment: "Playlang browser WASM playground (SPA)",
    });

    new route53.ARecord(this, "WebAliasRecord", {
      zone: props.hostedZone,
      recordName: WEB_DOMAIN,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(this.distribution),
      ),
    });

    new route53.AaaaRecord(this, "WebAliasRecordV6", {
      zone: props.hostedZone,
      recordName: WEB_DOMAIN,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(this.distribution),
      ),
    });

    // Large dist (~55 MB with C# WasmSharp assets); raise limits for sync.
    new s3deploy.BucketDeployment(this, "DeployWeb", {
      sources: [s3deploy.Source.asset(webDistRoot)],
      destinationBucket: this.bucket,
      memoryLimit: 2048,
      ephemeralStorageSize: cdk.Size.gibibytes(2),
    });

    new cdk.CfnOutput(this, "WebUrl", {
      value: WEB_URL,
      description: "Production playground URL",
      exportName: "PlaylangWebUrl",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront distribution id",
    });

    new cdk.CfnOutput(this, "WebBucketName", {
      value: this.bucket.bucketName,
      description: "Private S3 origin bucket",
    });
  }
}
