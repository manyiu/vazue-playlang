import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { githubOidcSubs } from "./github-config";

export interface PlaylangGithubOidcStackProps extends cdk.StackProps {
  webBucket: s3.IBucket;
  distribution: cloudfront.IDistribution;
  githubOwner: string;
  githubOwnerId: string;
  githubRepo: string;
  githubRepoId: string;
}

/**
 * Least-privilege role for GitHub Actions web publishes.
 *
 * Reuses the account GitHub OIDC provider (typically created by
 * `GithubActionsOidcStack` in aws-common-cdk). Does not create a second
 * provider — AWS allows only one per URL.
 *
 * Trust is this repository only (legacy `repo:login/repo:*` and immutable
 * `repo:login@id/repo@id:*`). Permissions stay limited to the Playlang web
 * bucket and CDN.
 */
export class PlaylangGithubOidcStack extends cdk.Stack {
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: PlaylangGithubOidcStackProps) {
    super(scope, id, props);

    const provider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      "GitHubOidcProvider",
      `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`,
    );

    this.deployRole = new iam.Role(this, "WebDeployRole", {
      roleName: "PlaylangWebDeploy",
      description:
        "GitHub Actions OIDC: S3 sync, CloudFront CSP sync + invalidation for Playlang",
      assumedBy: new iam.OpenIdConnectPrincipal(provider, {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        },
        StringLike: {
          "token.actions.githubusercontent.com:sub": githubOidcSubs(
            props.githubOwner,
            props.githubOwnerId,
            props.githubRepo,
            props.githubRepoId,
          ),
        },
      }),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    props.webBucket.grantReadWrite(this.deployRole);

    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "InvalidatePlaylangCdn",
        actions: [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations",
        ],
        resources: [
          `arn:aws:cloudfront::${this.account}:distribution/${props.distribution.distributionId}`,
        ],
      }),
    );

    const webStackArn = cdk.Arn.format(
      {
        service: "cloudformation",
        resource: "stack",
        resourceName: "PlaylangWebStack/*",
      },
      this,
    );

    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "ReadWebStackOutputs",
        actions: [
          "cloudformation:DescribeStacks",
          "cloudformation:DescribeStackResources",
        ],
        resources: [webStackArn],
      }),
    );

    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "SyncPlaylangCspHeaders",
        actions: [
          "cloudfront:GetResponseHeadersPolicy",
          "cloudfront:UpdateResponseHeadersPolicy",
        ],
        resources: [
          `arn:aws:cloudfront::${this.account}:response-headers-policy/*`,
        ],
      }),
    );

    new cdk.CfnOutput(this, "WebDeployRoleArn", {
      value: this.deployRole.roleArn,
      description: "Set as GitHub environment secret AWS_ROLE_ARN",
      exportName: "PlaylangWebDeployRoleArn",
    });
  }
}
