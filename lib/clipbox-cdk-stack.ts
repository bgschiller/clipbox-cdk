import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import { CfnOutput } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface CdkStackProps extends cdk.StackProps {
  /**
   * Domain where your clips will be accessible.
   * If left blank, they will be at a *.cloudfront.net domain.
   */
  domainName?: string;
  /**
   * a Route53 hosted zone for creating a CNAME from `domainName` to `something.cloudfront.net`, and for
   * creating a DNS-validated certificate
   */
  hostedZoneDomain?: string;
  /**
   * A certificate valid for `domainName`.
   * If left blank, but `hostedZoneDomain` is present, a DNS-validated certificate will be created.
   * If left blank, and `hostedZoneDomain` is also blank, `domainName` *must* be blank.
   */
  certificateArn?: string;
}

export class ClipboxCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    if (!props.certificateArn && !props.hostedZoneDomain && props.domainName) {
      throw new Error(`To specify a domainName, you must provide either a certificateArn, or a hostedZoneDomain.

We can't set a custom domain in Cloudfront without a SSL certificate for that domain.`);
    }

    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(
      this,
      "cloudfront-OAI",
      {
        comment: `OAI for Clipbox`,
      }
    );

    let certificate;
    if (props.certificateArn) {
      acm.Certificate.fromCertificateArn(
        this,
        "CloudfrontCertFromArn",
        props.certificateArn
      );
    }
    const hostedZone =
      props.hostedZoneDomain &&
      route53.HostedZone.fromLookup(this, "Zone", {
        domainName: props.hostedZoneDomain,
      });
    if (hostedZone && props.domainName) {
      certificate = new acm.DnsValidatedCertificate(this, "CloudfrontCert", {
        domainName: props.domainName,
        hostedZone,
        // This is intentionally hardcoded to us-east-1, because Cloudfront requires certificates to be there because it's a global service
        region: "us-east-1",
      });
    }

    const siteBucket = new s3.Bucket(this, "ClipboxBucket", {
      bucketName: props.domainName,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [siteBucket.arnForObjects("*")],
        principals: [
          new iam.CanonicalUserPrincipal(
            cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
    );

    const distribution = new cloudfront.Distribution(
      this,
      "ClipboxDistribution",
      {
        certificate,
        defaultRootObject: "index.html",
        domainNames: [props.domainName].filter(Boolean) as string[],
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        defaultBehavior: {
          origin: new cloudfront_origins.S3Origin(siteBucket, {
            originAccessIdentity: cloudfrontOAI,
          }),
          compress: true,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      }
    );

    if (hostedZone) {
      new route53.ARecord(this, "SiteARecord", {
        recordName: props.domainName,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution)
        ),
        zone: hostedZone,
      });
    }

    const policy = new iam.Policy(this, "clipbox-writer-policy", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "s3:PutObject",
            "s3:AbortMultipartUpload",
            "s3:PutObjectAcl",
          ],
          resources: [siteBucket.arnForObjects("*")],
        }),
      ],
    });

    const clipboxWriter = new iam.User(this, "ClipboxWriter", {
      userName: "clipbox-writer",
    });
    clipboxWriter.attachInlinePolicy(policy);
    const accessKey = new iam.CfnAccessKey(this, "CfnAccessKey", {
      userName: clipboxWriter.userName,
    });

    new CfnOutput(this, "accessKeyId", { value: accessKey.ref });
    new CfnOutput(this, "secretAccessKey", {
      value: accessKey.attrSecretAccessKey,
    });
    new CfnOutput(this, "run the following to set up your aws profile", {
      value: `printf "%s\n%s\n%s\njson" "${accessKey.ref}" "${
        accessKey.attrSecretAccessKey
      }" "${
        cdk.Stack.of(this).region
      }" | aws configure --profile clipbox-writer`,
    });

    new CfnOutput(
      this,
      "set this value as CLIPBOX_URL_PREFIX in your shell startup script (~/.zshrc or ~/.bashrc)",
      {
        value: props.domainName || distribution.distributionDomainName,
      }
    );
  }
}
