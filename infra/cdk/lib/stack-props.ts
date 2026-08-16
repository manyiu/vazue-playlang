import type * as cdk from "aws-cdk-lib";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";
import type * as route53 from "aws-cdk-lib/aws-route53";

export interface SiteStackProps extends cdk.StackProps {
  certificate: acm.ICertificate;
  hostedZone: route53.IHostedZone;
}
