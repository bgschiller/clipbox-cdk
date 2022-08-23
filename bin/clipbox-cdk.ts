#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ClipboxCdkStack } from "../lib/clipbox-cdk-stack";

const app = new cdk.App();
new ClipboxCdkStack(app, "ClipboxCdkStack", {
  /**
   * Domain where your clips will be accessible.
   * If left blank, they will be at a *.cloudfront.net domain.
   */
  //  domainName: "clip.brianschiller.com",
  /**
   * a Route53 hosted zone for creating a CNAME from `domainName` to `something.cloudfront.net`, and for
   * creating a DNS-validated certificate
   */
  //  hostedZoneDomain: "brianschiller.com",
  /**
   * A certificate valid for `domainName`.
   * If left blank, but `hostedZoneDomain` is present, a DNS-validated certificate will be created.
   * If left blank, and `hostedZoneDomain` is also blank, `domainName` *must* be blank.
   */
  //  certificateArn: "arn:aws:acm:region:123456789012:certificate/12345678-1234-1234-1234-123456789012"
});
