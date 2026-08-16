import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import type { Construct } from "constructs";
import { ROOT_DOMAIN, WEB_DOMAIN } from "./domain-config";

export class PlaylangDnsCertStack extends cdk.Stack {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.hostedZone = route53.HostedZone.fromLookup(this, "VazueZone", {
      domainName: ROOT_DOMAIN,
    });

    this.certificate = new acm.Certificate(this, "SiteCert", {
      domainName: WEB_DOMAIN,
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });

    new cdk.CfnOutput(this, "CertificateArn", {
      value: this.certificate.certificateArn,
      exportName: "PlaylangCertificateArn",
    });

    new cdk.CfnOutput(this, "HostedZoneId", {
      value: this.hostedZone.hostedZoneId,
      exportName: "PlaylangHostedZoneId",
    });
  }
}
