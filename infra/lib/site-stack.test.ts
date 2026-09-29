import { fileURLToPath } from "node:url";
import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { SITE_HOSTNAME } from "./constants.js";

const SITE = fileURLToPath(new URL("../../site", import.meta.url));

const synth = () => {
  const app = new App({ context: { hostedZoneId: "Z0000000000TEST" } });
  const { cert, site } = buildApp(app, SITE);
  return { cert: Template.fromStack(cert), site: Template.fromStack(site), stacks: { cert, site } };
};

describe("the site's infrastructure", () => {
  it("puts the certificate in us-east-1, for the zone's apex, validated by DNS", () => {
    const { cert, stacks } = synth();
    expect(stacks.cert.region).toBe("us-east-1");
    cert.hasResourceProperties("AWS::CertificateManager::Certificate", {
      DomainName: SITE_HOSTNAME,
      ValidationMethod: "DNS",
    });
  });

  it("serves a private bucket through CloudFront on the apex, over TLS, with security headers", () => {
    const { site, stacks } = synth();
    expect(stacks.site.region).toBe("us-west-2");
    site.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
    site.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        Aliases: [SITE_HOSTNAME],
        DefaultRootObject: "index.html",
        DefaultCacheBehavior: Match.objectLike({ ViewerProtocolPolicy: "redirect-to-https" }),
      }),
    });
    site.resourceCountIs("AWS::CloudFront::OriginAccessControl", 1);
  });

  it("points the apex at the distribution, for IPv4 and IPv6, and nothing else", () => {
    const { site } = synth();
    site.resourceCountIs("AWS::Route53::RecordSet", 2);
    for (const type of ["A", "AAAA"]) {
      site.hasResourceProperties("AWS::Route53::RecordSet", {
        Name: `${SITE_HOSTNAME}.`,
        Type: type,
        HostedZoneId: "Z0000000000TEST",
      });
    }
  });
});
