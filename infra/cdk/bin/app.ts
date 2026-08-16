#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PlaylangDnsCertStack } from "../lib/dns-cert-stack";
import { PlaylangWebStack } from "../lib/web-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
};

const dnsCertStack = new PlaylangDnsCertStack(app, "PlaylangDnsCertStack", {
  env,
  description: "Route53 + ACM certificate for Playlang",
});

const siteStackProps = {
  env,
  certificate: dnsCertStack.certificate,
  hostedZone: dnsCertStack.hostedZone,
};

const webStack = new PlaylangWebStack(app, "PlaylangWebStack", {
  ...siteStackProps,
  description: "S3 + CloudFront for Playlang playground SPA",
});
webStack.addDependency(dnsCertStack);
